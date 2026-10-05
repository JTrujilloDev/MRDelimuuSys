import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateExpectedCash,
  validateCashRegisterClosing,
  assertClosingSnapshot,
  summarizeShiftExpenses,
} from "./cashRegister.rules";

test("matches the displayed cash after sales, refunds, and legacy expenses", () => {
  assert.equal(
    calculateExpectedCash([
      { type: "OPENING", amount: 50_000, paymentMethod: null },
      { type: "SALE", amount: 28_000, paymentMethod: "CASH" },
      { type: "SALE", amount: 72_000, paymentMethod: "CASH" },
      { type: "REFUND", amount: -72_000, paymentMethod: "CASH" },
      { type: "SALE", amount: 28_000, paymentMethod: "CASH" },
      { type: "SALE", amount: 56_000, paymentMethod: "CARD" },
      { type: "EXPENSE", amount: -5_000, paymentMethod: null },
      { type: "SALE", amount: 47_000, paymentMethod: "CASH" },
    ]),
    148_000,
  );
});

test("closes a balanced register without justification", () => {
  assert.deepEqual(validateCashRegisterClosing(120_000, 120_000, ""), {
    closingAmount: 120_000,
    expectedCash: 120_000,
    difference: 0,
    differenceJustification: null,
  });
});

test("requires and normalizes a justification for cash differences", () => {
  assert.throws(
    () => validateCashRegisterClosing(119_000, 120_000, ""),
    /justification/,
  );
  assert.equal(
    validateCashRegisterClosing(119_000, 120_000, "  Faltante por revisar  ")
      .differenceJustification,
    "Faltante por revisar",
  );
});

test("rejects invalid closing amounts", () => {
  assert.throws(() => validateCashRegisterClosing(-1, 0, "Error"), /non-negative/);
  assert.throws(() => validateCashRegisterClosing("no", 0, "Error"), /non-negative/);
});

test("voided expenses do not affect cash or totals; electronic/credit payments are not cash", () => {
  const movements = [
    { type: "OPENING", amount: 100000, paymentMethod: null },
    { type: "SALE", amount: 200000, paymentMethod: "CASH" },
    { type: "EXPENSE", amount: -131000, paymentMethod: "CASH" },
    { type: "EXPENSE", amount: -131000, paymentMethod: "CASH", voidedAt: new Date() },
    { type: "SALE", amount: 50000, paymentMethod: "CREDIT" },
    { type: "SALE", amount: 50000, paymentMethod: "QR" },
    { type: "SALE", amount: 50000, paymentMethod: "CARD" },
  ];
  assert.equal(calculateExpectedCash(movements), 169000);
  assert.equal(summarizeShiftExpenses(movements), 131000);
  assert.equal(validateCashRegisterClosing(168500, 169000, "Faltan 500").difference, -500);
  assert.throws(() => assertClosingSnapshot(169000, 300000), /saldo de caja cambió/);
  assert.doesNotThrow(() => assertClosingSnapshot(169000, 169000));
  for (const value of [null, "", false, Infinity, NaN]) assert.throws(() => validateCashRegisterClosing(value, 0, ""));
});
