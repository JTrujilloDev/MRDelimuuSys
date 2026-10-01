export interface DispatchTransferItem {
  productVariantId: number;
  quantity: number;
}

export interface ReceiveTransferItem {
  itemId: number;
  quantityReceived: number;
}

export const normalizeTransferObservation = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Observation must be text");
  const observation = value.trim();
  if (!observation) return null;
  if (observation.length > 500) throw new Error("Observation cannot exceed 500 characters");
  return observation;
};

export const normalizeDispatchTransferItems = (value: unknown): DispatchTransferItem[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("At least one product is required for a transfer");
  }

  const items = value.map((item) => ({
    productVariantId: Number(item?.productVariantId),
    quantity: Number(item?.quantity),
  }));
  if (items.some((item) =>
    !Number.isInteger(item.productVariantId) || item.productVariantId <= 0 ||
    !Number.isInteger(item.quantity) || item.quantity <= 0,
  )) {
    throw new Error("Transfer quantities must be positive whole numbers");
  }
  if (new Set(items.map((item) => item.productVariantId)).size !== items.length) {
    throw new Error("A product variant cannot be repeated in a transfer");
  }
  return items;
};

export const normalizeReceiveTransferItems = (value: unknown): ReceiveTransferItem[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Received quantities are required");
  }
  const items = value.map((item) => ({
    itemId: Number(item?.itemId),
    quantityReceived: Number(item?.quantityReceived),
  }));
  if (items.some((item) =>
    !Number.isInteger(item.itemId) || item.itemId <= 0 ||
    !Number.isInteger(item.quantityReceived) || item.quantityReceived < 0,
  )) {
    throw new Error("Received quantities must be non-negative whole numbers");
  }
  if (new Set(items.map((item) => item.itemId)).size !== items.length) {
    throw new Error("A transfer item cannot be repeated");
  }
  return items;
};

export const requireTransferDiscrepancyReason = (
  hasDiscrepancy: boolean,
  value: unknown,
) => {
  const reason = normalizeTransferObservation(value);
  if (hasDiscrepancy && !reason) {
    throw new Error("A discrepancy reason is required when received quantities differ");
  }
  return hasDiscrepancy ? reason : null;
};
