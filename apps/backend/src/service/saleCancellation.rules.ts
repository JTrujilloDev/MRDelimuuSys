export const requireCancellationReason = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Cancellation reason is required");
  }
  return value.trim();
};

export const buildCancellationRegisterReversal = (
  cashRegisterId: number,
  total: number,
  discount: number,
  paymentMethod: "CASH" | "CARD" | "QR" | "CREDIT" | null,
) => ({
  cashRegisterId,
  saleAmount: -total,
  discountAmount: -discount,
  ...(paymentMethod === "CASH" && { cashAmount: -total }),
  ...(paymentMethod === "CARD" && { cardAmount: -total }),
  ...(paymentMethod === "QR" && { qrAmount: -total }),
  ...(paymentMethod === "CREDIT" && { creditAmount: -total }),
});
