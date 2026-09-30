import assert from "node:assert/strict";
import test from "node:test";
import {
  initializesInventory,
  isManualInventoryTransactionAllowed,
  normalizeInventoryQuantity,
} from "./POSInventory.rules";

test("allows each point to initialize stock from its first receipt or purchase", () => {
  assert.equal(initializesInventory("INITIAL"), true);
  assert.equal(initializesInventory("RECEIPT"), true);
  assert.equal(initializesInventory("PURCHASE"), true);
  assert.equal(initializesInventory("ADJUSTMENT"), false);
});

test("restricts manual movements according to product type", () => {
  assert.equal(isManualInventoryTransactionAllowed("FINISHED_PRODUCT", "RECEIPT"), true);
  assert.equal(isManualInventoryTransactionAllowed("INGREDIENT", "PURCHASE"), true);
  assert.equal(isManualInventoryTransactionAllowed("INGREDIENT", "RECEIPT"), false);
  assert.equal(isManualInventoryTransactionAllowed("RECIPE_PRODUCT", "ADJUSTMENT"), false);
});

test("normalizes entries and exits without changing adjustment direction", () => {
  assert.equal(normalizeInventoryQuantity("PURCHASE", -4), 4);
  assert.equal(normalizeInventoryQuantity("RECEIPT", -3), 3);
  assert.equal(normalizeInventoryQuantity("WASTE", 2), -2);
  assert.equal(normalizeInventoryQuantity("ADJUSTMENT", -1), -1);
});

test("rejects zero, decimal, and POS-only quantities", () => {
  assert.throws(() => normalizeInventoryQuantity("PURCHASE", 0), /non-zero integer/);
  assert.throws(() => normalizeInventoryQuantity("PURCHASE", 1.5), /non-zero integer/);
  assert.throws(() => normalizeInventoryQuantity("SALE", 1), /Invalid manual/);
});
