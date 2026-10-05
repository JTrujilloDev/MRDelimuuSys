import assert from "node:assert/strict";
import { test } from "node:test";
import { creditBalance, validateCreditCustomer, validateCreditPayment, summarizeCreditCollections } from "./credit.rules";
import { calculateExpectedCash } from "./cashRegister.rules";

test("identifica al cliente y exige un contacto", () => {
  assert.deepEqual(validateCreditCustomer({ name: "  Ana  ", phone: " 3001234567 " }), { name: "Ana", phone: "3001234567" });
  for (const input of [undefined, {}, { name: "Ana", phone: "" }, { name: "", phone: "3001234567" }]) assert.throws(() => validateCreditCustomer(input));
});
test("saldo ignora abonos anulados, ventas y otros movimientos", () => {
  assert.deepEqual(creditBalance(20000, [
    { type: "SALE", amount: 20000, paymentMethod: "CREDIT" },
    { type: "CASH_IN", amount: 5000, paymentMethod: "CASH" },
    { type: "CASH_IN", amount: 5000, paymentMethod: "QR", voidedAt: new Date() },
  ]), { paid: 5000, balance: 15000 });
});
test("abonos no pueden superar la deuda ni pagarse con otro crédito", () => {
  for (const value of [0, -1, NaN, Infinity, "5000", 5000.001, 20001]) assert.throws(() => validateCreditPayment(value, "CASH", 20000));
  assert.throws(() => validateCreditPayment(5000, "CREDIT", 20000));
  assert.equal(validateCreditPayment(20000, "QR", 20000), 20000);
});
test("separación de ventas y recaudos; solo el abono en efectivo afecta caja", () => {
  const transactions = [
    { type: "OPENING", amount: 10000, paymentMethod: null },
    { type: "SALE", amount: 20000, paymentMethod: "CREDIT", relatedAccountId: 1 },
    { type: "CASH_IN", amount: 5000, paymentMethod: "CASH", relatedAccountId: 1 },
    { type: "CASH_IN", amount: 3000, paymentMethod: "QR", relatedAccountId: 1 },
    { type: "CASH_IN", amount: 2000, paymentMethod: "CARD", relatedAccountId: 1 },
    { type: "CASH_IN", amount: 5000, paymentMethod: "CASH", relatedAccountId: 1, voidedAt: new Date() },
  ];
  assert.equal(calculateExpectedCash(transactions), 15000);
  assert.deepEqual(summarizeCreditCollections(transactions), { creditCollections: 10000, cashCreditCollections: 5000, cardCreditCollections: 2000, qrCreditCollections: 3000 });
});
