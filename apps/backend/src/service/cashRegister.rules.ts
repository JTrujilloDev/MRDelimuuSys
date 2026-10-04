type CashMovement = {
  type: string;
  amount: number;
  paymentMethod: string | null;
  voidedAt?: Date | null;
};

export const calculateExpectedCash = (transactions: CashMovement[]) =>
  transactions.reduce((cash, transaction) => {
    if (transaction.voidedAt) return cash;
    if (transaction.type === "OPENING") return cash + transaction.amount;
    if (
      (transaction.type === "SALE" || transaction.type === "REFUND") &&
      transaction.paymentMethod === "CASH"
    ) {
      return cash + transaction.amount;
    }
    // Los gastos registrados por el POS siempre salen de la caja física.
    // También cubre registros anteriores que no guardaron paymentMethod.
    if (transaction.type === "EXPENSE") {
      return cash - Math.abs(transaction.amount);
    }
    if (transaction.type === "ADJUSTMENT" && transaction.paymentMethod === "CASH") {
      return cash + transaction.amount;
    }
    return cash;
  }, 0);

export const summarizeShiftExpenses = (transactions: CashMovement[]) =>
  transactions.reduce((total, item) => total + (item.type === "EXPENSE" && !item.voidedAt ? Math.abs(item.amount) : 0), 0);

export const assertClosingSnapshot = (displayedExpectedCash: unknown, expectedCash: number) => {
  if (displayedExpectedCash === undefined) return; // Compatibility with older clients.
  if (typeof displayedExpectedCash !== "number" || !Number.isFinite(displayedExpectedCash)
    || Math.abs(displayedExpectedCash - expectedCash) >= 0.01) {
    throw new Error("El saldo de caja cambió. Actualiza el resumen y revisa el descuadre antes de cerrar.");
  }
};

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

  if (closingAmountValue === null || closingAmountValue === "" || typeof closingAmountValue === "boolean" || !Number.isFinite(closingAmount) || closingAmount < 0) {
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
