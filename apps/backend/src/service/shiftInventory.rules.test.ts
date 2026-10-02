import { test } from "node:test";
import assert from "node:assert/strict";
import { countPhase, validateCount, assertSnapshot } from "./shiftInventory.rules";

test("opening and closing phases only", () => {
  assert.equal(countPhase("OPENING"), "OPENING");
  assert.equal(countPhase("CLOSING"), "CLOSING");
  assert.throws(() => countPhase("anything"));
});
test("blank is not zero; explicit zero is a valid count", () => {
  for (const invalid of [null, undefined, "", "0", -1, 1.2, NaN, Infinity, 2147483648]) assert.throws(() => validateCount(invalid, 0, ""));
  assert.deepEqual(validateCount(0, 0, ""), { countedQuantity: 0, difference: 0, justification: null });
});
test("both shortages and surpluses require justification", () => {
  assert.throws(() => validateCount(8, 10, "  "));
  assert.throws(() => validateCount(12, 10, null));
  assert.equal(validateCount(8, 10, " Faltante recibido ").difference, -2);
  assert.equal(validateCount(12, 10, "Sobrante").difference, 2);
});
test("sale during count requires fresh verification", () => {
  assert.throws(() => assertSnapshot(10, 100, 9, 101), /inventario cambió/);
  assert.doesNotThrow(() => assertSnapshot(9, 101, 9, 101));
});
test("offsetting movements cannot hide a stale verification", () => {
  assert.throws(() => assertSnapshot(10, 100, 10, 102));
});
