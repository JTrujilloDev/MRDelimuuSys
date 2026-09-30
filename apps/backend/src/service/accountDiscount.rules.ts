export interface AccountDiscountResult {
  grossTotal: number;
  discount: number;
  discountObservation: string | null;
  netTotal: number;
}

export const calculateAccountDiscount = (
  grossTotalValue: unknown,
  discountValue: unknown,
  observationValue: unknown,
): AccountDiscountResult => {
  const grossTotal = Number(grossTotalValue);
  const discount = Number(discountValue ?? 0);
  const discountObservation =
    typeof observationValue === "string" && observationValue.trim()
      ? observationValue.trim()
      : null;

  if (!Number.isFinite(grossTotal) || grossTotal < 0) {
    throw new Error("Invalid account subtotal");
  }
  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error("Discount must be a non-negative number");
  }
  if (discount > grossTotal) {
    throw new Error("Discount cannot be greater than account subtotal");
  }
  if (discount > 0 && !discountObservation) {
    throw new Error("Discount justification is required");
  }

  return {
    grossTotal,
    discount,
    discountObservation: discount > 0 ? discountObservation : null,
    netTotal: grossTotal - discount,
  };
};
