import assert from "node:assert/strict";
import test from "node:test";
import { calculateAccountDiscount } from "./accountDiscount.rules";

test("calculates a regular discount and preserves its justification", () => {
  assert.deepEqual(calculateAccountDiscount(14_000, 7_000, "  Cortesía  "), {
    grossTotal: 14_000,
    discount: 7_000,
    discountObservation: "Cortesía",
    netTotal: 7_000,
  });
});

test("allows a full courtesy without changing the gross sale", () => {
  assert.deepEqual(calculateAccountDiscount(7_000, 7_000, "Cliente invitado"), {
    grossTotal: 7_000,
    discount: 7_000,
    discountObservation: "Cliente invitado",
    netTotal: 0,
  });
});

test("clears the observation when there is no discount", () => {
  assert.equal(calculateAccountDiscount(7_000, 0, "Texto anterior").discountObservation, null);
});

test("requires a valid amount and justification", () => {
  assert.throws(() => calculateAccountDiscount(7_000, -1, "Error"), /non-negative/);
  assert.throws(() => calculateAccountDiscount(7_000, 8_000, "Error"), /greater/);
  assert.throws(() => calculateAccountDiscount(7_000, 7_000, " "), /justification/);
});
