import { prisma } from "../../lib/prisma";
import { PaymentMethod, Prisma } from "../../generated/prisma/client";
import { lockInventoryVerificationTx } from "./inventoryVerificationLock";
import { creditBalance, validateCreditPayment, validateCreditCustomer } from "./credit.rules";

export const prepareCreditCustomerTx = async (tx: Prisma.TransactionClient, customer: { name?: unknown; phone?: unknown } | undefined) =>
  tx.customer.create({ data: validateCreditCustomer(customer) });

export const listCredits = async (storeId: number, database: Pick<typeof prisma, "account"> = prisma) => {
  const accounts = await database.account.findMany({
    where: { paymentMethod: "CREDIT", status: { in: ["CLOSED", "CANCELLED"] }, terminal: { storeId } },
    include: { customer: true, terminal: { select: { name: true } }, financialTransactions: {
      where: { type: "CASH_IN" }, orderBy: { createdAt: "desc" },
      include: { createdByUser: { select: { name: true } } },
      // The actual operator can be an administrator assisting another user's shift.
    } }, orderBy: { closedAt: "desc" },
  });
  return accounts.map(account => ({
    id: account.id, name: account.name, closedAt: account.closedAt, total: account.total,
    customer: account.customer, terminal: account.terminal.name,
    ...creditBalance(account.status === "CANCELLED" ? 0 : account.total, account.financialTransactions),
    status: account.status === "CANCELLED" ? "CANCELLED" : creditBalance(account.total, account.financialTransactions).balance > 0 ? "PENDING" : "PAID",
    payments: account.financialTransactions.map(item => ({ id: item.id, amount: item.amount, paymentMethod: item.paymentMethod,
      createdAt: item.createdAt, observation: item.adjustmentJustification, cashRegisterId: item.relatedCashRegisterId,
      receivedBy: item.createdByUser?.name, voidedAt: item.voidedAt, voidReason: item.voidReason })),
  }));
};

export const registerCreditPayment = async (input: {
  accountId: number; storeId: number; terminalId: number; cashRegisterId: number; userId: number;
  amount: unknown; paymentMethod: unknown; observation?: unknown; requestKey: unknown;
}, database: Pick<typeof prisma, "$transaction"> = prisma) => database.$transaction(async tx => {
  if (!Number.isInteger(input.accountId) || input.accountId <= 0) throw new Error("Crédito inválido");
  if (typeof input.requestKey !== "string" || !/^[a-f0-9-]{36}$/i.test(input.requestKey)) throw new Error("Identificación de abono inválida");
  if (input.observation != null && typeof input.observation !== "string") throw new Error("Observación inválida");
  const observation = typeof input.observation === "string" ? input.observation.trim() : "";
  if (observation.length > 500) throw new Error("La observación es demasiado larga");
  await lockInventoryVerificationTx(tx);
  await tx.$queryRaw`SELECT "id" FROM "CashRegister" WHERE "id" = ${input.cashRegisterId} FOR UPDATE`;
  const register = await tx.cashRegister.findFirst({ where: { id: input.cashRegisterId, terminalId: input.terminalId, terminal: { storeId: input.storeId } } });
  if (!register || register.status !== "OPEN") throw new Error("Abre un turno en el punto activo para registrar abonos");
  await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${input.accountId} FOR UPDATE`;
  const account = await tx.account.findFirst({
    where: { id: input.accountId, terminal: { storeId: input.storeId }, paymentMethod: "CREDIT", status: "CLOSED" },
    include: { financialTransactions: { where: { type: "CASH_IN", voidedAt: null } } },
  });
  if (!account) throw new Error("El crédito no está disponible en este punto");
  const previous = await tx.financialTransaction.findUnique({ where: { requestKey: input.requestKey } });
  if (previous) {
    if (previous.type !== "CASH_IN" || previous.relatedAccountId !== account.id || previous.relatedCashRegisterId !== register.id
      || previous.amount !== input.amount || previous.paymentMethod !== input.paymentMethod || previous.adjustmentJustification !== (observation || null) || previous.voidedAt) throw new Error("La solicitud ya se utilizó para otro movimiento");
    return { payment: previous, ...creditBalance(account.total, account.financialTransactions) };
  }
  const amount = validateCreditPayment(input.amount, input.paymentMethod, creditBalance(account.total, account.financialTransactions).balance);
  const payment = await tx.financialTransaction.create({ data: {
    type: "CASH_IN", amount, paymentMethod: input.paymentMethod as PaymentMethod,
    createdByUserId: input.userId,
    relatedAccountId: account.id, relatedCashRegisterId: register.id, requestKey: input.requestKey,
    description: `Abono de crédito de venta #${account.id}`, adjustmentJustification: observation || null,
  } });
  return { payment, ...creditBalance(account.total, [...account.financialTransactions, payment]) };
});

export const voidCreditPayment = async (input: {
  accountId: number; paymentId: number; storeId: number; terminalId: number; cashRegisterId: number; userId: number; reason: unknown;
}, database: Pick<typeof prisma, "$transaction"> = prisma) => database.$transaction(async tx => {
  if (typeof input.reason !== "string" || !input.reason.trim() || input.reason.trim().length > 500) throw new Error("Indica el motivo de anulación del abono");
  if (!Number.isInteger(input.paymentId) || input.paymentId <= 0) throw new Error("Abono inválido");
  await lockInventoryVerificationTx(tx);
  await tx.$queryRaw`SELECT "id" FROM "CashRegister" WHERE "id" = ${input.cashRegisterId} FOR UPDATE`;
  const register = await tx.cashRegister.findFirst({ where: { id: input.cashRegisterId, terminalId: input.terminalId, terminal: { storeId: input.storeId } } });
  if (!register || register.status !== "OPEN") throw new Error("Solo se pueden anular abonos del turno abierto");
  const account = await tx.account.findFirst({ where: { id: input.accountId, terminal: { storeId: input.storeId }, status: "CLOSED", paymentMethod: "CREDIT" } });
  if (!account) throw new Error("El crédito no está disponible en este punto");
  const claimed = await tx.financialTransaction.updateMany({
    where: { id: input.paymentId, type: "CASH_IN", relatedAccountId: account.id, relatedCashRegisterId: register.id, voidedAt: null },
    data: { voidedAt: new Date(), voidReason: input.reason.trim(), voidedByUserId: input.userId },
  });
  if (!claimed.count) throw new Error("El abono no pertenece al turno activo o ya fue anulado");
  return { voided: true };
});
