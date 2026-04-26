import { CashRegister } from "../../generated/prisma/client";
import { CashRegisterStatus } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

export interface UpdateCashRegisterTotalsInput {
  cashRegisterId: number;
  saleAmount?: number;
  discountAmount?: number;
  expenseAmount?: number;
  cashAmount?: number;
  cardAmount?: number;
  qrAmount?: number;
  creditAmount?: number;
}
export const createCashRegisterService = async (data: CashRegister) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Validar usuario
    if (!data.userId) {
      throw new Error("userId is required");
    }

    // 2. Validar monto inicial
    const openingAmount = data.openingAmount || 0;

    if (openingAmount < 0) {
      throw new Error("Opening amount cannot be negative");
    }

    // 3. Verificar si ya hay caja abierta (por terminal o usuario)
    const existingCashRegister = await tx.cashRegister.findFirst({
      where: {
        terminalId: data.terminalId,
        status: "OPEN",
      },
    });

    if (existingCashRegister) {
      throw new Error(
        "There is already an open cash register for this terminal",
      );
    }

    // 4. Crear caja (solo datos válidos al abrir)
    const cashRegisterEntry = await tx.cashRegister.create({
      data: {
        userId: data.userId,
        terminalId: data.terminalId,
        openedAt: new Date(),
        openingAmount,
        status: "OPEN",

        // ⚠️ NO incluir:
        // closedAt
        // closingAmount
        // difference
      },
    });

    await tx.financialTransaction.create({
      data: {
        type: "OPENING",
        amount: openingAmount,
        relatedCashRegisterId: cashRegisterEntry.id,
        description: "Base del día",
      },
    });

    return cashRegisterEntry;
  });
};

export const closeCashRegisterService = async (
  cashRegisterId: number,
  closingAmount: number, // dinero contado físicamente
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Obtener caja
    const cashRegister = await tx.cashRegister.findUnique({
      where: { id: cashRegisterId },
    });

    if (!cashRegister) {
      throw new Error("Cash register not found");
    }

    if (cashRegister.status !== "OPEN") {
      throw new Error("Cash register already closed");
    }

    // 2. Obtener movimientos financieros de la caja
    const transactions = await tx.financialTransaction.findMany({
      where: {
        relatedCashRegisterId: cashRegisterId,
      },
    });

    // 3. Calcular totales
    let totalSales = 0;
    let totalExpenses = 0;
    let cashIn = 0;

    for (const t of transactions) {
      if (t.type === "SALE") {
        totalSales += t.amount;

        // solo efectivo entra a caja física
        if (t.paymentMethod === "CASH") {
          cashIn += t.amount;
        }
      }

      if (t.type === "EXPENSE") {
        totalExpenses += Math.abs(t.amount);

        if (t.paymentMethod === "CASH") {
          cashIn -= Math.abs(t.amount);
        }
      }

      if (t.type === "ADJUSTMENT") {
        if (t.paymentMethod === "CASH") {
          cashIn += t.amount;
        }
      }

      if (t.type === "OPENING") {
        cashIn += t.amount;
      }
    }

    // 4. Efectivo esperado
    const expectedCash = cashIn;

    // 5. Diferencia
    const difference = closingAmount - expectedCash;

    // 6. Cerrar caja
    const closedCashRegister = await tx.cashRegister.update({
      where: { id: cashRegisterId },
      data: {
        closedAt: new Date(),
        closingAmount,
        difference,
        status: "CLOSED",
      },
    });

    // 7. Registrar ajuste si hay diferencia
    if (difference !== 0) {
      await tx.financialTransaction.create({
        data: {
          type: "ADJUSTMENT",
          amount: difference,
          relatedCashRegisterId: cashRegisterId,
          paymentMethod: "CASH",
          adjustmentJustification: "Cash closing difference",
        },
      });
    }

    return {
      cashRegister: closedCashRegister,
      summary: {
        totalSales,
        totalExpenses,
        expectedCash,
        closingAmount,
        difference,
      },
    };
  });
};

export const getAllCashRegistersService = async () => {
  const cashRegisters = await prisma.cashRegister.findMany();
  return cashRegisters;
};

export const getOpenCashRegisterService = async (terminalId: number) => {
  const cashRegister = await prisma.cashRegister.findFirst({
    where: {
      terminalId,
      status: "OPEN",
    },
  });
  return cashRegister;
};

//FUNCION INTERNA PARA ACTUALIZAR LOS TOTALES DE LA CAJA EN CADA TRANSACCION
export const updateCashRegisterTotalsTx = async (
  tx: any,
  {
    cashRegisterId,
    saleAmount,
    discountAmount,
    expenseAmount,
    cashAmount,
    cardAmount,
    qrAmount,
    creditAmount,
  }: UpdateCashRegisterTotalsInput,
) => {
  const hasUpdates =
    saleAmount !== undefined ||
    discountAmount !== undefined ||
    expenseAmount !== undefined ||
    cashAmount !== undefined ||
    cardAmount !== undefined ||
    qrAmount !== undefined ||
    creditAmount !== undefined;

  if (!hasUpdates) return;

  return await tx.cashRegister.update({
    where: { id: cashRegisterId },
    data: {
      ...(saleAmount !== undefined && {
        totalSales: { increment: saleAmount },
      }),
      ...(discountAmount !== undefined && {
        totalDiscounts: { increment: discountAmount },
      }),
      ...(expenseAmount !== undefined && {
        totalExpenses: { increment: expenseAmount },
      }),
      ...(cashAmount !== undefined && {
        cashAmount: { increment: cashAmount },
      }),
      ...(cardAmount !== undefined && {
        cardAmount: { increment: cardAmount },
      }),
      ...(qrAmount !== undefined && {
        qrAmount: { increment: qrAmount },
      }),
      ...(creditAmount !== undefined && {
        creditAmount: { increment: creditAmount },
      }),
    },
  });
};
