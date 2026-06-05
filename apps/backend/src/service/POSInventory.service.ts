import {
  InventoryTransaction,
  InventoryTransactionType,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

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

export const getPOSInventoryTransactionsService = async (filters?: {
  productVariantId?: number;
  type?: string;
  from?: Date;
  to?: Date;
}) => {
  return await prisma.inventoryTransaction.findMany({
    where: {
      productVariantId: filters?.productVariantId,
      type: filters?.type as InventoryTransactionType,
      createdAt:
        filters?.from && filters?.to
          ? {
              gte: filters.from,
              lte: filters.to,
            }
          : undefined,
    },
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
    take: 100, // límite básico
  });
};
