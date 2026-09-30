import type {
  InventoryTransactionType,
  ProductType,
} from "../../generated/prisma/client";

const manualTransactionsByProductType: Record<
  ProductType,
  InventoryTransactionType[]
> = {
  INGREDIENT: ["PURCHASE", "ADJUSTMENT", "WASTE", "INTERNAL_CONSUMPTION"],
  PACKAGING: ["PURCHASE", "ADJUSTMENT", "WASTE", "INTERNAL_CONSUMPTION"],
  PREPARED_BASE: ["ADJUSTMENT", "WASTE", "RECEIPT", "INTERNAL_CONSUMPTION"],
  FINISHED_PRODUCT: ["ADJUSTMENT", "RETURN", "WASTE", "RECEIPT", "INTERNAL_CONSUMPTION"],
  THIRD_PARTY_PRODUCT: ["PURCHASE", "ADJUSTMENT", "RETURN", "WASTE", "INTERNAL_CONSUMPTION"],
  RECIPE_PRODUCT: [],
};

export const isManualInventoryTransactionAllowed = (
  productType: ProductType,
  transactionType: InventoryTransactionType,
) => manualTransactionsByProductType[productType].includes(transactionType);

export const initializesInventory = (type: InventoryTransactionType) =>
  ["INITIAL", "RECEIPT", "PURCHASE"].includes(type);

export const normalizeInventoryQuantity = (
  type: InventoryTransactionType,
  quantity: number,
) => {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error("Quantity must be a non-zero integer");
  }

  switch (type) {
    case "PURCHASE":
    case "RETURN":
    case "RECEIPT":
    case "INITIAL":
      return Math.abs(quantity);
    case "WASTE":
    case "INTERNAL_CONSUMPTION":
      return -Math.abs(quantity);
    case "ADJUSTMENT":
      return quantity;
    default:
      throw new Error("Invalid manual transaction type");
  }
};
