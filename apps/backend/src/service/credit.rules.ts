export const roundCreditMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

type Movement = { type: string; amount: number; paymentMethod: string | null; voidedAt?: Date | null; relatedAccountId?: number | null };

export const creditBalance = (total: number, transactions: Movement[]) => {
  const paid = roundCreditMoney(transactions.reduce((sum, item) => sum + (item.type === "CASH_IN" && !item.voidedAt ? item.amount : 0), 0));
  return { paid, balance: roundCreditMoney(Math.max(0, total - paid)) };
};

export const validateCreditPayment = (amount: unknown, method: unknown, balance: number) => {
  if (!["CASH", "CARD", "QR"].includes(String(method))) throw new Error("El abono debe recibirse en efectivo, tarjeta o QR");
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0
    || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) throw new Error("Ingresa un abono válido con máximo dos decimales");
  if (amount > balance) throw new Error("El abono supera el saldo pendiente");
  return roundCreditMoney(amount);
};

export const validateCreditCustomer = (value: { name?: unknown; phone?: unknown } | null | undefined) => {
  if (typeof value?.name !== "string" || value.name.trim().length < 2 || value.name.trim().length > 120) throw new Error("Indica el nombre del cliente del crédito");
  if (typeof value.phone !== "string" || value.phone.trim().length < 5 || value.phone.trim().length > 40) throw new Error("Indica un teléfono de contacto para el crédito");
  return { name: value.name.trim(), phone: value.phone.trim() };
};

export const summarizeCreditCollections = (transactions: Movement[]) => {
  const result = { creditCollections: 0, cashCreditCollections: 0, cardCreditCollections: 0, qrCreditCollections: 0 };
  for (const item of transactions) {
    if (item.type !== "CASH_IN" || item.voidedAt || !item.relatedAccountId) continue;
    result.creditCollections += item.amount;
    if (item.paymentMethod === "CASH") result.cashCreditCollections += item.amount;
    if (item.paymentMethod === "CARD") result.cardCreditCollections += item.amount;
    if (item.paymentMethod === "QR") result.qrCreditCollections += item.amount;
  }
  return result;
};
