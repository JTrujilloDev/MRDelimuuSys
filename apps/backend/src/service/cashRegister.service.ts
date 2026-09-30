import { CashRegister } from "../../generated/prisma/client";
import { CashRegisterStatus } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { validateCashRegisterClosing } from "./cashRegister.rules";

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
        status: "OPEN",
        OR: [{ terminalId: data.terminalId }, { userId: data.userId }],
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
  differenceJustification?: unknown,
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

    const openAccounts = await tx.account.count({
      where: { terminalId: cashRegister.terminalId, status: "OPEN" },
    });
    if (openAccounts > 0) {
      throw new Error(
        `Cannot close the shift with ${openAccounts} open account${openAccounts === 1 ? "" : "s"}`,
      );
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

      if (t.type === "REFUND") {
        totalSales += t.amount;
        if (t.paymentMethod === "CASH") cashIn += t.amount;
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

    // 5. Diferencia y justificación
    const closing = validateCashRegisterClosing(
      closingAmount,
      expectedCash,
      differenceJustification,
    );

    // 6. Cerrar caja
    const claimedRegister = await tx.cashRegister.updateMany({
      where: { id: cashRegisterId, status: "OPEN" },
      data: {
        closedAt: new Date(),
        closingAmount: closing.closingAmount,
        difference: closing.difference,
        status: "CLOSED",
      },
    });
    if (claimedRegister.count === 0) throw new Error("Cash register already closed");
    const closedCashRegister = await tx.cashRegister.findUniqueOrThrow({
      where: { id: cashRegisterId },
    });

    // 7. Registrar ajuste si hay diferencia
    if (Math.abs(closing.difference) >= 0.01) {
      await tx.financialTransaction.create({
        data: {
          type: "ADJUSTMENT",
          amount: closing.difference,
          relatedCashRegisterId: cashRegisterId,
          paymentMethod: "CASH",
          adjustmentJustification: closing.differenceJustification,
        },
      });
    }

    return {
      cashRegister: closedCashRegister,
      summary: {
        totalSales,
        totalExpenses,
        expectedCash,
        closingAmount: closing.closingAmount,
        difference: closing.difference,
      },
    };
  });
};

export const getAllCashRegistersService = async (storeId: number) => {
  const cashRegisters = await prisma.cashRegister.findMany({
    where: { terminal: { storeId } },
  });
  return cashRegisters;
};

export const getCashRegisterHistoryService = async (
  from: Date,
  to: Date,
  storeId: number,
  userId: number,
  canViewAllShifts: boolean,
) => {
  const cashRegisters = await prisma.cashRegister.findMany({
    where: {
      terminal: { storeId },
      ...(!canViewAllShifts && { userId }),
      openedAt: { lte: to },
      OR: [
        { closedAt: { gte: from } },
        { closedAt: null },
      ],
    },
    orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
    include: {
      user: { select: { id: true, name: true } },
      terminal: { select: { id: true, name: true } },
      transactions: {
        where: { type: { in: ["EXPENSE", "ADJUSTMENT"] } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          adjustmentJustification: true,
          createdAt: true,
        },
      },
      accounts: {
        where: { status: { in: ["CLOSED", "CANCELLED"] } },
        orderBy: { closedAt: "desc" },
        include: {
          cancelledByUser: { select: { id: true, name: true } },
          accountItems: {
            include: {
              productVariant: {
                select: {
                  id: true,
                  name: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const cashRegisterIds = cashRegisters.map((cashRegister) => cashRegister.id);
  const periodSoldItems = cashRegisterIds.length
    ? await prisma.accountItem.findMany({
        where: {
          account: {
            status: "CLOSED",
            cashRegisterId: { in: cashRegisterIds },
          },
        },
        select: {
          quantity: true,
          productVariantId: true,
          productVariant: {
            select: {
              name: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      })
    : [];

  const products = new Map<
    number,
    {
      productId: number;
      productName: string;
      quantity: number;
      variants: Map<
        number,
        { productVariantId: number; variantName: string; quantity: number }
      >;
    }
  >();

  for (const item of periodSoldItems) {
    const product = item.productVariant.product;
    let currentProduct = products.get(product.id);

    if (!currentProduct) {
      currentProduct = {
        productId: product.id,
        productName: product.name,
        quantity: 0,
        variants: new Map(),
      };
      products.set(product.id, currentProduct);
    }

    currentProduct.quantity += item.quantity;
    const currentVariant = currentProduct.variants.get(item.productVariantId);

    if (currentVariant) {
      currentVariant.quantity += item.quantity;
    } else {
      currentProduct.variants.set(item.productVariantId, {
        productVariantId: item.productVariantId,
        variantName: item.productVariant.name,
        quantity: item.quantity,
      });
    }
  }

  const registersWithSales = cashRegisters.map((cashRegister) => {
    const variants = new Map<
      number,
      { productVariantId: number; productName: string; variantName: string; quantity: number }
    >();

    for (const account of cashRegister.accounts) {
      if (account.status !== "CLOSED") continue;
      for (const item of account.accountItems) {
        const current = variants.get(item.productVariantId);
        if (current) {
          current.quantity += item.quantity;
        } else {
          variants.set(item.productVariantId, {
            productVariantId: item.productVariantId,
            productName: item.productVariant.product.name,
            variantName: item.productVariant.name,
            quantity: item.quantity,
          });
        }
      }
    }

    return {
      ...cashRegister,
      soldVariants: Array.from(variants.values()).sort(
        (a, b) => b.quantity - a.quantity,
      ),
      soldVariantUnits: Array.from(variants.values()).reduce(
        (total, variant) => total + variant.quantity,
        0,
      ),
    };
  });

  return {
    cashRegisters: registersWithSales,
    soldProducts: Array.from(products.values())
      .map((product) => ({
        productId: product.productId,
        productName: product.productName,
        quantity: product.quantity,
        variants: Array.from(product.variants.values()).sort(
          (a, b) => b.quantity - a.quantity,
        ),
      }))
      .sort((a, b) => b.quantity - a.quantity),
  };
};

export const getOpenCashRegisterService = async (terminalId: number) => {
  const cashRegister = await prisma.cashRegister.findFirst({
    where: {
      terminalId,
      status: "OPEN",
    },
    include:{
      user: { select: { id: true, name: true } },
      accounts: {
        include: {
          accountItems: true,
          cancelledByUser: { select: { id: true, name: true } },
        }
      } 
    }
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
