import type { BillingDocumentSnapshot, BillingPayment } from "./billing-provider";

const moneyPattern = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
const signedMoneyPattern = /^-?(0|[1-9]\d*)(\.\d{1,2})?$/;
const quantityPattern = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

const parseDecimalToMinorUnits = (value: string, signed = false) => {
  const normalized = value.trim();
  const pattern = signed ? signedMoneyPattern : moneyPattern;
  if (!pattern.test(normalized)) throw new Error(`Invalid decimal amount: ${value}`);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, decimals = ""] = unsigned.split(".");
  const minorUnits = (BigInt(whole) * 100n) + BigInt(decimals.padEnd(2, "0"));
  return negative ? -minorUnits : minorUnits;
};

const formatMinorUnits = (value: bigint) => {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const decimals = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${decimals}`;
};

export const normalizeMoney = (value: string) => formatMinorUnits(parseDecimalToMinorUnits(value));

export const computeCashRoundingAmount = (total: string, payments: BillingPayment[]) => {
  const totalMinorUnits = parseDecimalToMinorUnits(total);
  const paymentMinorUnits = payments.reduce(
    (sum, payment) => sum + parseDecimalToMinorUnits(payment.amount),
    0n,
  );
  const difference = totalMinorUnits - paymentMinorUnits;
  if (difference < -50_000n || difference > 50_000n) {
    throw new Error("Payment amounts differ from the invoice total by more than COP 500.00");
  }
  return formatMinorUnits(difference);
};

export const validateBillingSnapshot = (snapshot: BillingDocumentSnapshot) => {
  if (!snapshot.referenceCode.trim()) throw new Error("Billing reference code is required");
  if (snapshot.kind !== "SALE_INVOICE") throw new Error(`Unsupported billing document kind: ${snapshot.kind}`);
  if (snapshot.currency !== "COP") throw new Error("The initial billing integration only supports COP");
  if (snapshot.lines.length === 0) throw new Error("An electronic invoice requires at least one line");
  if (snapshot.payments.length === 0) throw new Error("An electronic invoice requires payment details");

  const subtotal = parseDecimalToMinorUnits(snapshot.subtotal);
  const discount = parseDecimalToMinorUnits(snapshot.discountTotal);
  const tax = parseDecimalToMinorUnits(snapshot.taxTotal);
  const total = parseDecimalToMinorUnits(snapshot.total);
  if (subtotal - discount + tax !== total) {
    throw new Error("Invoice totals are not arithmetically consistent");
  }

  for (const line of snapshot.lines) {
    if (!line.reference.trim() || !line.name.trim()) throw new Error("Every invoice line requires a reference and name");
    if (!quantityPattern.test(line.quantity) || Number(line.quantity) <= 0) throw new Error("Invoice line quantity must be positive");
    parseDecimalToMinorUnits(line.unitPriceBeforeTax);
    parseDecimalToMinorUnits(line.discountAmount);
    if (line.taxes.length === 0) throw new Error("Every invoice line requires its fiscal tax classification");
    line.taxes.forEach((itemTax) => parseDecimalToMinorUnits(itemTax.rate));
  }

  for (const payment of snapshot.payments) {
    parseDecimalToMinorUnits(payment.amount);
    if (payment.term === "CREDIT" && !/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate ?? "")) {
      throw new Error("Credit payments require a due date in YYYY-MM-DD format");
    }
  }

  computeCashRoundingAmount(snapshot.total, snapshot.payments);
  return snapshot;
};
