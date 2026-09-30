import assert from "node:assert/strict";
import test from "node:test";
import { validateCashRegisterClosing } from "./cashRegister.rules";

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
