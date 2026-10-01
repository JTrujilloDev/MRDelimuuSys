import assert from "node:assert/strict";
import test from "node:test";
import {
  initializesInventory,
  isManualInventoryTransactionAllowed,
  normalizeInventoryLossDetails,
  normalizeInventoryQuantity,
  snapshotInventoryLossUnitCost,
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

test("requires a structured reason for waste and observation only for other", () => {
  assert.deepEqual(
    normalizeInventoryLossDetails("WASTE", "EXPIRATION", "  Lote 14  "),
    { lossReason: "EXPIRATION", observation: "Lote 14" },
  );
  assert.throws(
    () => normalizeInventoryLossDetails("WASTE", undefined, "Vencido"),
    /loss reason/,
  );
  assert.throws(
    () => normalizeInventoryLossDetails("WASTE", "OTHER", ""),
    /Observation/,
  );
  assert.deepEqual(
    normalizeInventoryLossDetails("ADJUSTMENT", "DAMAGED", "  Conteo físico  "),
    { lossReason: null, observation: "Conteo físico" },
  );
});

test("snapshots cost only for waste transactions", () => {
  assert.equal(snapshotInventoryLossUnitCost("WASTE", 3_200), 3_200);
  assert.equal(snapshotInventoryLossUnitCost("ADJUSTMENT", 3_200), null);
  assert.throws(() => snapshotInventoryLossUnitCost("WASTE", -1), /group cost/);
});
