import { FinancialTransaction } from "../../generated/prisma/client";
import { PaymentMethod } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

export const createFinancialTransactionService = async (
  data: FinancialTransaction,
) => {
  return await prisma.$transaction(async (tx) => {

    // 1. Validar monto
    if (!data.amount || data.amount <= 0) {
      throw new Error("Invalid amount");
    }

    // 2. Validar tipo vs monto
    let amount = data.amount;

    switch (data.type) {
      case "SALE":
        amount = Math.abs(amount);
        break;

      case "EXPENSE":
        amount = -Math.abs(amount);
        break;

      case "ADJUSTMENT":
        // puede ser +/- pero requiere justificación
        if (!data.adjustmentJustification) {
          throw new Error("Justification required for adjustment");
        }
        break;

      default:
        throw new Error("Invalid transaction type");
    }

    // 3. Validar caja
    if (data.relatedCashRegisterId) {
      const cashRegister = await tx.cashRegister.findUnique({
        where: { id: data.relatedCashRegisterId },
      });

      if (!cashRegister) {
        throw new Error("Cash register not found");
      }

      if (cashRegister.status !== "OPEN") {
        throw new Error("Cash register is not open");
      }
    }

    // 4. Crear transacción
    const transaction = await tx.financialTransaction.create({
      data: {
        type: data.type,
        amount,
        description: data.description,
        relatedAccountId: data.relatedAccountId,
        relatedCashRegisterId: data.relatedCashRegisterId,
        paymentMethod: data.paymentMethod,
        adjustmentJustification: data.adjustmentJustification,
      },
    });

    return transaction;
  });
};

interface FinancialTransactionFilters {
  type?: "SALE" | "EXPENSE" | "ADJUSTMENT";
  paymentMethod?: PaymentMethod;
  cashRegisterId?: number;
  accountId?: number;
  minAmount?: number;
  maxAmount?: number;
  from?: Date;
  to?: Date;
  search?: string;
  page?: number;
  limit?: number;
}
export const getFinancialTransactionsService = async (
  filters: FinancialTransactionFilters = {}
) => {
  const {
    type,
    paymentMethod,
    cashRegisterId,
    accountId,
    minAmount,
    maxAmount,
    from,
    to,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const where: any = {};

  // 1. Filtros directos
  if (type) where.type = type;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (cashRegisterId) where.relatedCashRegisterId = cashRegisterId;
  if (accountId) where.relatedAccountId = accountId;

  // 2. Rango de montos
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount.gte = minAmount;
    if (maxAmount !== undefined) where.amount.lte = maxAmount;
  }

  // 3. Rango de fechas
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  // 4. Búsqueda por texto
  if (search) {
    where.OR = [
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        adjustmentJustification: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // 5. Paginación
  const skip = (page - 1) * limit;

  const [transactions, total] = await prisma.$transaction([
    prisma.financialTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return {
    data: transactions,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
