import type {
  InventoryLossReason,
  InventoryTransactionType,
  ProductType,
} from "../../generated/prisma/client";

const inventoryLossReasons = new Set<InventoryLossReason>([
  "EXPIRATION",
  "DAMAGED",
  "PREPARATION_ERROR",
  "QUALITY_CONTROL",
  "OTHER",
]);

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

export const normalizeInventoryLossDetails = (
  type: InventoryTransactionType,
  lossReasonValue: unknown,
  observationValue: unknown,
) => {
  const observation =
    typeof observationValue === "string" && observationValue.trim()
      ? observationValue.trim()
      : null;

  if (type !== "WASTE") {
    return { lossReason: null, observation };
  }

  if (
    typeof lossReasonValue !== "string" ||
    !inventoryLossReasons.has(lossReasonValue as InventoryLossReason)
  ) {
    throw new Error("A valid loss reason is required for waste transactions");
  }

  const lossReason = lossReasonValue as InventoryLossReason;
  if (lossReason === "OTHER" && !observation) {
    throw new Error("Observation is required when the loss reason is other");
  }

  return { lossReason, observation };
};

export const snapshotInventoryLossUnitCost = (
  type: InventoryTransactionType,
  costValue: unknown,
) => {
  if (type !== "WASTE") return null;
  const cost = Number(costValue);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error("A valid group cost is required for waste transactions");
  }
  return cost;
};
