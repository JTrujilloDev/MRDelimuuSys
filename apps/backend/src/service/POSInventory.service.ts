import {
  InventoryTransactionType,
  Prisma,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { randomUUID } from "crypto";
import {
  initializesInventory,
  isManualInventoryTransactionAllowed,
  normalizeInventoryQuantity,
} from "./POSInventory.rules";

interface BulkInventoryTransactionItem {
  productVariantId: number;
  quantity: number;
  observation?: string;
}

interface CreateBulkInventoryTransactionData {
  type: InventoryTransactionType;
  observation?: string;
  items: BulkInventoryTransactionItem[];
}

interface CreateInventoryTransactionData {
  productVariantId: number;
  relatedAccountId?: number | null;
  quantity: number;
  type: InventoryTransactionType;
  observation?: string | null;
}

export const createPOSInventoryTransactionService = async (
  data: CreateInventoryTransactionData,
  storeId: number,
  userId: number,
) => {
  return await prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({
      where: { id: storeId },
      select: { groupId: true },
    });
    if (!store) throw new Error("Store not found");

    // 1. Validar producto
    const product = await tx.productVariant.findUnique({
      where: { id: data.productVariantId },
      include: {
        product: true,
        catalogItems: { where: { groupId: store.groupId } },
        storeInventories: { where: { storeId } },
      },
    });

    if (!product || !product.isActive) {
      throw new Error("Product not found or inactive");
    }
    if (product.catalogItems.length === 0) {
      throw new Error("Product does not belong to the active store group");
    }

    // 2. Determinar cantidad según tipo
    const inventory = product.storeInventories[0] ?? await tx.storeInventory.create({
      data: { storeId, productVariantId: product.id },
    });
    if (data.type === "INITIAL") {
      if (inventory.isInitialized || product.product.productType === "RECIPE_PRODUCT") {
        throw new Error("Product is not available for initial inventory");
      }
    } else {
      if (!isManualInventoryTransactionAllowed(product.product.productType, data.type)) {
        throw new Error("Invalid transaction type for product");
      }
      if (!inventory.isInitialized && !initializesInventory(data.type)) {
        throw new Error("Product requires initial inventory first");
      }
    }
    const quantity = normalizeInventoryQuantity(data.type, Number(data.quantity));

    // 3. Validar stock (solo para salidas)
    if (quantity < 0) {
      const newStock = inventory.stock + quantity;

      if (newStock < 0) {
        throw new Error("Insufficient stock");
      }
    }

    if (
      ["WASTE", "ADJUSTMENT", "INTERNAL_CONSUMPTION"].includes(data.type) &&
      !data.observation
    ) {
      throw new Error(
        "Observation is required for waste, adjustment, and internal consumption transactions",
      );
    }

    // 4. Crear movimiento
    const transaction = await tx.inventoryTransaction.create({
      data: {
        productVariantId: product.id,
        storeId,
        createdByUserId: userId,
        relatedAccountId: data.relatedAccountId,
        quantity,
        unit: product.unit,
        type: data.type,
        observation: data.observation,
      },
    });

    // 5. Actualizar stock
    await tx.storeInventory.update({
      where: { id: inventory.id },
      data: {
        stock: inventory.stock + quantity,
        ...(initializesInventory(data.type) && { isInitialized: true }),
      },
    });
    return transaction;
  });
};

export const createBulkPOSInventoryTransactionService = async (
  data: CreateBulkInventoryTransactionData,
  storeId: number,
  userId: number,
) => {
  if (!data.type) {
    throw new Error("Transaction type is required");
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("At least one inventory item is required");
  }

  const variantIds = data.items.map((item) => Number(item.productVariantId));

  if (variantIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("Invalid product variant");
  }

  if (new Set(variantIds).size !== variantIds.length) {
    throw new Error("A product variant cannot be repeated");
  }

  if (
    ["WASTE", "ADJUSTMENT", "INTERNAL_CONSUMPTION"].includes(data.type) &&
    !data.observation?.trim() &&
    data.items.some((item) => !item.observation?.trim())
  ) {
    throw new Error("Observation is required for this transaction type");
  }

  return prisma.$transaction(async (tx) => {
    const operationId = randomUUID();
    const store = await tx.store.findUnique({
      where: { id: storeId },
      select: { groupId: true },
    });
    if (!store) throw new Error("Store not found");
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: true,
        catalogItems: { where: { groupId: store.groupId } },
        storeInventories: { where: { storeId } },
      },
    });

    if (variants.length !== variantIds.length) {
      throw new Error("One or more product variants were not found");
    }

    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
    const normalizedItems = data.items.map((item) => {
      const variant = variantsById.get(Number(item.productVariantId));

      if (!variant || !variant.isActive) {
        throw new Error("Product not found or inactive");
      }
      if (variant.catalogItems.length === 0) {
        throw new Error(`${variant.product.name} - ${variant.name} does not belong to the active store group`);
      }

      const inventory = variant.storeInventories[0];

      if (data.type === "INITIAL") {
        if (inventory?.isInitialized || variant.product.productType === "RECIPE_PRODUCT") {
          throw new Error(`${variant.product.name} - ${variant.name} is not available for initial inventory`);
        }
      } else {
        if (!inventory?.isInitialized && !initializesInventory(data.type)) {
          throw new Error(`${variant.product.name} - ${variant.name} requires initial inventory first`);
        }

        if (!isManualInventoryTransactionAllowed(variant.product.productType, data.type)) {
          throw new Error(`${variant.product.name} - ${variant.name} is not available for this transaction type`);
        }
      }

      const quantity = normalizeInventoryQuantity(data.type, Number(item.quantity));

      const currentStock = inventory?.stock ?? 0;
      if (currentStock + quantity < 0) {
        throw new Error(`Insufficient stock for ${variant.product.name} - ${variant.name}`);
      }

      return {
        variant,
        inventory,
        quantity,
        observation: item.observation?.trim() || data.observation?.trim() || undefined,
      };
    });

    const transactions = [];

    for (const item of normalizedItems) {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          operationId,
          storeId,
          createdByUserId: userId,
          productVariantId: item.variant.id,
          quantity: item.quantity,
          unit: item.variant.unit,
          type: data.type,
          observation: item.observation,
        },
      });

      await tx.storeInventory.upsert({
        where: {
          storeId_productVariantId: { storeId, productVariantId: item.variant.id },
        },
        create: {
          storeId,
          productVariantId: item.variant.id,
          stock: item.quantity,
          isInitialized: initializesInventory(data.type),
        },
        update: {
          stock: { increment: item.quantity },
          ...(initializesInventory(data.type) && { isInitialized: true }),
        },
      });

      transactions.push(transaction);
    }

    return transactions;
  });
};

interface InventoryTransactionFilters {
  search?: string;
  type?: string;
  origin?: "ALL" | "MANUAL" | "POS";
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export const updateStoreInventorySettingsService = async (
  storeId: number,
  productVariantIdValue: unknown,
  minStockValue: unknown,
) => {
  const productVariantId = Number(productVariantIdValue);
  const minStock = Number(minStockValue);
  if (!Number.isInteger(productVariantId) || productVariantId <= 0) {
    throw new Error("Invalid product variant");
  }
  if (!Number.isInteger(minStock) || minStock < 0) {
    throw new Error("Minimum stock must be a non-negative integer");
  }
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { groupId: true } });
  if (!store) throw new Error("Store not found");
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    include: { catalogItems: { where: { groupId: store.groupId } } },
  });
  if (!variant) throw new Error("Product variant not found");
  if (variant.catalogItems.length === 0) throw new Error("Product does not belong to the active store group");

  return prisma.storeInventory.upsert({
    where: { storeId_productVariantId: { storeId, productVariantId } },
    create: { storeId, productVariantId, minStock },
    update: { minStock },
  });
};

export const getPOSInventoryTransactionsService = async (
  storeId: number,
  filters: InventoryTransactionFilters = {},
) => {
  const requestedPage = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const normalizedSearch = filters.search?.trim();
  const validType =
    filters.type &&
    Object.values(InventoryTransactionType).includes(
      filters.type as InventoryTransactionType,
    )
      ? (filters.type as InventoryTransactionType)
      : undefined;

  const where: Prisma.InventoryTransactionWhereInput = {
    storeId,
    type: validType,
    AND:
      filters.origin === "POS"
        ? [{ type: "SALE" }]
        : filters.origin === "MANUAL"
          ? [{ type: { not: "SALE" } }]
          : undefined,
    createdAt:
      filters.from || filters.to
        ? {
            ...(filters.from && { gte: filters.from }),
            ...(filters.to && { lte: filters.to }),
          }
        : undefined,
    ...(normalizedSearch && {
      productVariant: {
        is: {
          OR: [
            { name: { contains: normalizedSearch, mode: "insensitive" } },
            {
              product: {
                is: {
                  name: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        },
      },
    }),
  };

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      productVariant: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  type TransactionWithProduct = (typeof transactions)[number];
  interface GroupedOperation {
    id: string;
    operationId: string | null;
    type: InventoryTransactionType;
    origin: "MANUAL" | "POS";
    observation: string | null;
    createdAt: Date;
    items: TransactionWithProduct[];
  }

  const operationsById = new Map<string, GroupedOperation>();

  for (const transaction of transactions) {
    const groupId =
      transaction.operationId ??
      (transaction.type === "SALE" && transaction.relatedAccountId
        ? `sale-${transaction.relatedAccountId}`
        : `transaction-${transaction.id}`);
    const existingOperation = operationsById.get(groupId);

    if (existingOperation) {
      existingOperation.items.push(transaction);
      if (!existingOperation.observation && transaction.observation) {
        existingOperation.observation = transaction.observation;
      }
      continue;
    }

    operationsById.set(groupId, {
      id: groupId,
      operationId: transaction.operationId,
      type: transaction.type,
      origin: transaction.type === "SALE" ? "POS" : "MANUAL",
      observation: transaction.observation,
      createdAt: transaction.createdAt,
      items: [transaction],
    });
  }

  const operations = Array.from(operationsById.values());
  const totalOperations = operations.length;
  const totalPages = Math.max(1, Math.ceil(totalOperations / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const entriesByUnit = transactions
    .filter((transaction) => transaction.quantity > 0)
    .reduce<Record<string, number>>((totals, transaction) => {
      const unit = transaction.productVariant.unit;
      totals[unit] = (totals[unit] ?? 0) + transaction.quantity;
      return totals;
    }, {});
  const exitsByUnit = transactions
    .filter((transaction) => transaction.quantity < 0)
    .reduce<Record<string, number>>((totals, transaction) => {
      const unit = transaction.productVariant.unit;
      totals[unit] = (totals[unit] ?? 0) + Math.abs(transaction.quantity);
      return totals;
    }, {});

  return {
    operations: operations.slice(start, start + pageSize),
    summary: {
      operations: totalOperations,
      entriesByUnit,
      exitsByUnit,
      products: new Set(
        transactions.map(
          (transaction) => transaction.productVariant.product.id,
        ),
      ).size,
    },
    pagination: {
      page,
      pageSize,
      totalOperations,
      totalPages,
    },
  };
};
