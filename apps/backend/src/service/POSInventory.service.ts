import {
  InventoryTransaction,
  InventoryTransactionType,
  Prisma,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { randomUUID } from "crypto";

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

const manualTransactionsByProductType: Record<string, InventoryTransactionType[]> = {
  INGREDIENT: ["PURCHASE", "ADJUSTMENT", "WASTE", "INTERNAL_CONSUMPTION"],
  PACKAGING: ["PURCHASE", "ADJUSTMENT", "WASTE", "INTERNAL_CONSUMPTION"],
  PREPARED_BASE: [
    "ADJUSTMENT",
    "WASTE",
    "PRODUCTION",
    "WHOLESALE",
    "INTERNAL_CONSUMPTION",
  ],
  FINISHED_PRODUCT: [
    "ADJUSTMENT",
    "RETURN",
    "WASTE",
    "PRODUCTION",
    "WHOLESALE",
    "INTERNAL_CONSUMPTION",
  ],
  THIRD_PARTY_PRODUCT: [
    "PURCHASE",
    "ADJUSTMENT",
    "RETURN",
    "WASTE",
    "INTERNAL_CONSUMPTION",
  ],
  RECIPE_PRODUCT: [],
};

const normalizeQuantity = (
  type: InventoryTransactionType,
  quantity: number,
) => {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error("Quantity must be a non-zero integer");
  }

  switch (type) {
    case "PURCHASE":
    case "RETURN":
    case "PRODUCTION":
    case "INITIAL":
      return Math.abs(quantity);
    case "WASTE":
    case "WHOLESALE":
    case "INTERNAL_CONSUMPTION":
      return -Math.abs(quantity);
    case "ADJUSTMENT":
      return quantity;
    default:
      throw new Error("Invalid manual transaction type");
  }
};

export const createPOSInventoryTransactionService = async (
  data: InventoryTransaction,
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Validar producto
    const product = await tx.productVariant.findUnique({
      where: { id: data.productVariantId },
    });

    if (!product || !product.isActive) {
      throw new Error("Product not found or inactive");
    }

    // 2. Determinar cantidad según tipo
    let quantity = data.quantity;

    if (!quantity || quantity === 0) {
      throw new Error("Invalid quantity");
    }

    switch (data.type) {
      case "SALE":
        quantity = -Math.abs(quantity);
        break;

      case "PURCHASE":
        quantity = Math.abs(quantity);
        break;

      case "ADJUSTMENT":
        quantity = quantity;
        break;

      case "RETURN":
        quantity = Math.abs(quantity);
        break;

      case "WASTE":
        quantity = -Math.abs(quantity);
        break;

      case "PRODUCTION":
        quantity = Math.abs(quantity);
        break;

      case "INITIAL":
        quantity = Math.abs(quantity);
        break;

      case "WHOLESALE":
        quantity = -Math.abs(quantity);
        break;

      case "INTERNAL_CONSUMPTION":
        quantity = -Math.abs(quantity);
        break;

      default:
        throw new Error("Invalid transaction type");
    }

    // 3. Validar stock (solo para salidas)
    if (quantity < 0) {
      const newStock = product.stock + quantity;

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
        relatedAccountId: data.relatedAccountId,
        quantity,
        unit: product.unit,
        type: data.type,
        observation: data.observation,
      },
    });

    // 5. Actualizar stock
    await tx.productVariant.update({
      where: { id: product.id },
      data: {
        stock: product.stock + quantity,
      },
    });

    if (data.type === "INITIAL") {
      await tx.productVariant.update({
        where: { id: product.id },
        data: {
          isNew: false,
        },
      });
    }
    return transaction;
  });
};

export const createBulkPOSInventoryTransactionService = async (
  data: CreateBulkInventoryTransactionData,
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
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
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

      if (data.type === "INITIAL") {
        if (!variant.isNew || variant.product.productType === "RECIPE_PRODUCT") {
          throw new Error(`${variant.product.name} - ${variant.name} is not available for initial inventory`);
        }
      } else {
        if (variant.isNew) {
          throw new Error(`${variant.product.name} - ${variant.name} requires initial inventory first`);
        }

        const availableTypes =
          manualTransactionsByProductType[variant.product.productType] ?? [];

        if (!availableTypes.includes(data.type)) {
          throw new Error(`${variant.product.name} - ${variant.name} is not available for this transaction type`);
        }
      }

      const quantity = normalizeQuantity(data.type, Number(item.quantity));

      if (variant.stock + quantity < 0) {
        throw new Error(`Insufficient stock for ${variant.product.name} - ${variant.name}`);
      }

      return {
        variant,
        quantity,
        observation: item.observation?.trim() || data.observation?.trim() || undefined,
      };
    });

    const transactions = [];

    for (const item of normalizedItems) {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          operationId,
          productVariantId: item.variant.id,
          quantity: item.quantity,
          unit: item.variant.unit,
          type: data.type,
          observation: item.observation,
        },
      });

      await tx.productVariant.update({
        where: { id: item.variant.id },
        data: {
          stock: { increment: item.quantity },
          ...(data.type === "INITIAL" && { isNew: false }),
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

export const getPOSInventoryTransactionsService = async (
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
