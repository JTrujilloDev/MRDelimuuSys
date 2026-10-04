import { FinancialTransaction } from "../../generated/prisma/client";
import { PaymentMethod } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { updateCashRegisterTotalsTx } from "./cashRegister.service";
import { lockInventoryVerificationTx } from "./inventoryVerificationLock";

export const createFinancialTransactionService = async (
  data: FinancialTransaction,
  database: Pick<typeof prisma, "$transaction"> = prisma,
) => {
  return await database.$transaction(async (tx) => {
    if (data.type !== "EXPENSE") throw new Error("Solo se pueden registrar gastos desde este formulario");
    if (!Number.isInteger(data.relatedCashRegisterId) || Number(data.relatedCashRegisterId) <= 0) throw new Error("Valid cash register required");
    await lockInventoryVerificationTx(tx);
    await tx.$queryRaw`SELECT "id" FROM "CashRegister" WHERE "id" = ${data.relatedCashRegisterId} FOR UPDATE`;
    // 1. Validar monto
    if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
      throw new Error("Invalid amount");
    }

    // 2. Validar tipo vs monto
    if (typeof data.description !== "string" || !data.description.trim()) throw new Error("Expense description is required");
    if (typeof data.adjustmentJustification !== "string" || !data.adjustmentJustification.trim()) throw new Error("Expense observation is required");
    const amount = -Math.abs(data.amount);

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

    if (data.requestKey != null) {
      if (typeof data.requestKey !== "string" || !/^[a-f0-9-]{36}$/i.test(data.requestKey)) throw new Error("Invalid request key");
      const previous = await tx.financialTransaction.findUnique({ where: { requestKey: data.requestKey } });
      if (previous) {
        if (previous.relatedCashRegisterId !== data.relatedCashRegisterId || previous.type !== "EXPENSE"
          || previous.amount !== amount || previous.description !== data.description.trim()
          || previous.adjustmentJustification !== data.adjustmentJustification.trim()) throw new Error("La solicitud ya se utilizó para otro gasto");
        if (previous.voidedAt) throw new Error("El gasto de esta solicitud fue anulado");
        return previous;
      }
    }

    if (data.relatedCashRegisterId && data.type === "EXPENSE") {
      await updateCashRegisterTotalsTx(tx, {
        cashRegisterId: data.relatedCashRegisterId,
        expenseAmount: data.amount,
      });
    }

    // 4. Crear transacción
    const transaction = await tx.financialTransaction.create({
      data: {
        type: data.type,
        requestKey: data.requestKey ?? null,
        amount,
        description: data.description?.trim(),
        relatedAccountId: data.relatedAccountId,
        relatedCashRegisterId: data.relatedCashRegisterId,
        paymentMethod: data.type === "EXPENSE" ? "CASH" : data.paymentMethod,
        adjustmentJustification: data.adjustmentJustification?.trim(),
      },
    });

    return transaction;
  });
};

export const voidExpenseService = async (
  id: number, cashRegisterId: number, userId: number, reason: unknown,
  database: Pick<typeof prisma, "$transaction"> = prisma,
) => database.$transaction(async tx => {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Gasto inválido");
  if (typeof reason !== "string" || !reason.trim()) throw new Error("Indica el motivo de anulación");
  await lockInventoryVerificationTx(tx);
  await tx.$queryRaw`SELECT "id" FROM "CashRegister" WHERE "id" = ${cashRegisterId} FOR UPDATE`;
  const register = await tx.cashRegister.findUnique({ where: { id: cashRegisterId } });
  if (!register || register.status !== "OPEN") throw new Error("No se pueden anular gastos de un turno cerrado");
  const expense = await tx.financialTransaction.findUnique({ where: { id } });
  if (!expense || expense.type !== "EXPENSE" || expense.relatedCashRegisterId !== cashRegisterId) throw new Error("El gasto no pertenece al turno activo");
  const result = await tx.financialTransaction.updateMany({
    where: { id, type: "EXPENSE", relatedCashRegisterId: cashRegisterId, voidedAt: null },
    data: { voidedAt: new Date(), voidReason: reason.trim(), voidedByUserId: userId },
  });
  if (!result.count) throw new Error("El gasto ya fue anulado");
  await updateCashRegisterTotalsTx(tx, { cashRegisterId, expenseAmount: -Math.abs(expense.amount) });
  return { id, voided: true };
});

interface FinancialTransactionFilters {
  includeVoided?: string;
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
  filters: FinancialTransactionFilters,
  storeId: number,
  database: Pick<typeof prisma, "$transaction" | "financialTransaction"> = prisma,
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

  const where: any = {
    cashRegister: { terminal: { storeId } },
    ...(filters.includeVoided !== "true" && { voidedAt: null }),
  };

  // 1. Filtros directos
  if (type) where.type = type;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (cashRegisterId) where.relatedCashRegisterId = Number(cashRegisterId); // TODO: cashRegisterId;
  if (accountId) where.relatedAccountId = Number(accountId);

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
  const pageNumber = Number(page);
  const pageSize = Number(limit);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Invalid pagination");
  const fullShiftExpenses = type === "EXPENSE" && Number(cashRegisterId) > 0;
  const skip = fullShiftExpenses ? 0 : (pageNumber - 1) * pageSize;

  const [transactions, total] = await database.$transaction([
    database.financialTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      ...(fullShiftExpenses ? {} : { take: pageSize }),
    }),
    database.financialTransaction.count({ where }),
  ]);

  return {
    data: transactions,
    meta: {
      total,
      page: fullShiftExpenses ? 1 : pageNumber,
      limit: fullShiftExpenses ? total : pageSize,
      totalPages: fullShiftExpenses ? (total ? 1 : 0) : Math.ceil(total / pageSize),
    },
  };
};
