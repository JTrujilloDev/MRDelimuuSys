export const validateCashRegisterClosing = (
  closingAmountValue: unknown,
  expectedCashValue: unknown,
  differenceJustificationValue: unknown,
) => {
  const closingAmount = Number(closingAmountValue);
  const expectedCash = Number(expectedCashValue);
  const differenceJustification =
    typeof differenceJustificationValue === "string" &&
    differenceJustificationValue.trim()
      ? differenceJustificationValue.trim()
      : null;

  if (!Number.isFinite(closingAmount) || closingAmount < 0) {
    throw new Error("Closing amount must be a non-negative number");
  }
  if (!Number.isFinite(expectedCash)) {
    throw new Error("Invalid expected cash amount");
  }

  const difference = closingAmount - expectedCash;
  if (Math.abs(difference) >= 0.01 && !differenceJustification) {
    throw new Error("Cash difference justification is required");
  }

  return { closingAmount, expectedCash, difference, differenceJustification };
};
