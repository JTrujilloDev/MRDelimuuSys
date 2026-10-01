import type {
  InventoryTransactionType,
  Prisma,
  Unit,
} from "../../generated/prisma/client";

const UNTRACKED_LOT_CODE = "SIN-LOTE";

export interface InventoryLotDetails {
  code: string;
  manufacturedAt: Date | null;
  expiresAt: Date;
}

interface InventoryMovementData {
  storeId: number;
  productVariantId: number;
  quantity: number;
  unit: Unit;
  type: InventoryTransactionType;
  operationId?: string | null;
  createdByUserId?: number | null;
  relatedAccountId?: number | null;
  lossReason?: Prisma.InventoryTransactionCreateInput["lossReason"];
  unitCost?: number | null;
  observation?: string | null;
  lotDetails?: InventoryLotDetails | null;
  inventoryLotId?: number | null;
  initializesInventory?: boolean;
  allowExpiredLots?: boolean;
}

const parseDateOnly = (value: unknown, field: string) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} is invalid`);
  }
  return date;
};

export const normalizeReceiptLotDetails = (
  type: InventoryTransactionType,
  values: { lotCode?: unknown; manufacturedAt?: unknown; expiresAt?: unknown },
  today = new Date(),
): InventoryLotDetails | null => {
  if (type !== "RECEIPT") return null;

  const code = typeof values.lotCode === "string" ? values.lotCode.trim().toUpperCase() : "";
  if (!code) throw new Error("Lot code is required for plant receipts");
  if (code.length > 80) throw new Error("Lot code cannot exceed 80 characters");

  const expiresAt = parseDateOnly(values.expiresAt, "Expiration date");
  const manufacturedAt = values.manufacturedAt
    ? parseDateOnly(values.manufacturedAt, "Manufacturing date")
    : null;

  if (manufacturedAt && manufacturedAt > expiresAt) {
    throw new Error("Manufacturing date cannot be after expiration date");
  }

  const currentDate = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ));
  if (expiresAt < currentDate) {
    throw new Error("Expired products cannot be received from plant");
  }

  return { code, manufacturedAt, expiresAt };
};

const sameDate = (left: Date | null, right: Date | null) =>
  left?.getTime() === right?.getTime();

const resolveInboundLot = async (
  tx: Prisma.TransactionClient,
  productVariantId: number,
  lotDetails?: InventoryLotDetails | null,
  inventoryLotId?: number | null,
) => {
  if (inventoryLotId) {
    const lot = await tx.inventoryLot.findFirst({
      where: { id: inventoryLotId, productVariantId },
    });
    if (!lot) throw new Error("Inventory lot does not belong to the product variant");
    return lot;
  }

  if (!lotDetails) {
    return tx.inventoryLot.upsert({
      where: {
        productVariantId_code: { productVariantId, code: UNTRACKED_LOT_CODE },
      },
      create: { productVariantId, code: UNTRACKED_LOT_CODE },
      update: {},
    });
  }

  const existing = await tx.inventoryLot.findUnique({
    where: {
      productVariantId_code: { productVariantId, code: lotDetails.code },
    },
  });
  if (existing) {
    if (
      !sameDate(existing.manufacturedAt, lotDetails.manufacturedAt) ||
      !sameDate(existing.expiresAt, lotDetails.expiresAt)
    ) {
      throw new Error(`Lot ${lotDetails.code} already exists with different dates`);
    }
    return existing;
  }

  return tx.inventoryLot.create({
    data: { productVariantId, ...lotDetails },
  });
};

const getFefoAllocations = async (
  tx: Prisma.TransactionClient,
  storeId: number,
  productVariantId: number,
  requestedQuantity: number,
  allowExpiredLots: boolean,
) => {
  const lotInventories = await tx.storeLotInventory.findMany({
    where: {
      storeId,
      stock: { gt: 0 },
      inventoryLot: { productVariantId },
    },
    include: { inventoryLot: true },
  });

  const today = new Date();
  const todayStart = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ));
  const eligibleLots = lotInventories
    .filter(({ inventoryLot }) =>
      allowExpiredLots || !inventoryLot.expiresAt || inventoryLot.expiresAt >= todayStart,
    )
    .sort((left, right) => {
      const leftExpiry = left.inventoryLot.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightExpiry = right.inventoryLot.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftExpiry - rightExpiry || left.inventoryLot.id - right.inventoryLot.id;
    });

  let remaining = requestedQuantity;
  const allocations: Array<{ inventoryLotId: number; quantity: number }> = [];
  for (const lotInventory of eligibleLots) {
    if (remaining === 0) break;
    const quantity = Math.min(remaining, lotInventory.stock);
    allocations.push({ inventoryLotId: lotInventory.inventoryLotId, quantity });
    remaining -= quantity;
  }

  if (remaining > 0) {
    throw new Error(
      allowExpiredLots
        ? "Insufficient lot stock"
        : "Insufficient non-expired lot stock",
    );
  }
  return allocations;
};

export const applyInventoryMovementTx = async (
  tx: Prisma.TransactionClient,
  data: InventoryMovementData,
) => {
  if (!Number.isInteger(data.quantity) || data.quantity === 0) {
    throw new Error("Inventory movement quantity must be a non-zero integer");
  }

  const commonTransactionData = {
    operationId: data.operationId,
    storeId: data.storeId,
    createdByUserId: data.createdByUserId,
    productVariantId: data.productVariantId,
    relatedAccountId: data.relatedAccountId,
    unit: data.unit,
    type: data.type,
    lossReason: data.lossReason,
    unitCost: data.unitCost,
    observation: data.observation,
  };
  const transactions = [];

  if (data.quantity > 0) {
    const lot = await resolveInboundLot(
      tx,
      data.productVariantId,
      data.lotDetails,
      data.inventoryLotId,
    );
    await tx.storeLotInventory.upsert({
      where: {
        storeId_inventoryLotId: {
          storeId: data.storeId,
          inventoryLotId: lot.id,
        },
      },
      create: { storeId: data.storeId, inventoryLotId: lot.id, stock: data.quantity },
      update: { stock: { increment: data.quantity } },
    });
    transactions.push(await tx.inventoryTransaction.create({
      data: { ...commonTransactionData, inventoryLotId: lot.id, quantity: data.quantity },
    }));
  } else {
    const allocations = await getFefoAllocations(
      tx,
      data.storeId,
      data.productVariantId,
      Math.abs(data.quantity),
      data.allowExpiredLots ?? data.type !== "SALE",
    );
    for (const allocation of allocations) {
      await tx.storeLotInventory.update({
        where: {
          storeId_inventoryLotId: {
            storeId: data.storeId,
            inventoryLotId: allocation.inventoryLotId,
          },
        },
        data: { stock: { decrement: allocation.quantity } },
      });
      transactions.push(await tx.inventoryTransaction.create({
        data: {
          ...commonTransactionData,
          inventoryLotId: allocation.inventoryLotId,
          quantity: -allocation.quantity,
        },
      }));
    }
  }

  await tx.storeInventory.upsert({
    where: {
      storeId_productVariantId: {
        storeId: data.storeId,
        productVariantId: data.productVariantId,
      },
    },
    create: {
      storeId: data.storeId,
      productVariantId: data.productVariantId,
      stock: data.quantity,
      isInitialized: Boolean(data.initializesInventory),
    },
    update: {
      stock: { increment: data.quantity },
      ...(data.initializesInventory && { isInitialized: true }),
    },
  });

  return transactions;
};
