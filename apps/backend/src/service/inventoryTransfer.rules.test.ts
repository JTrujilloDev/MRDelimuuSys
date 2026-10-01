import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeDispatchTransferItems,
  normalizeReceiveTransferItems,
  requireTransferDiscrepancyReason,
} from "./inventoryTransfer.rules";

test("validates whole transfer quantities without repeated variants", () => {
  assert.deepEqual(
    normalizeDispatchTransferItems([{ productVariantId: 4, quantity: 3 }]),
    [{ productVariantId: 4, quantity: 3 }],
  );
  assert.throws(
    () => normalizeDispatchTransferItems([
      { productVariantId: 4, quantity: 1 },
      { productVariantId: 4, quantity: 2 },
    ]),
    /cannot be repeated/,
  );
});

test("allows zero received units but rejects negative quantities", () => {
  assert.deepEqual(
    normalizeReceiveTransferItems([{ itemId: 8, quantityReceived: 0 }]),
    [{ itemId: 8, quantityReceived: 0 }],
  );
  assert.throws(
    () => normalizeReceiveTransferItems([{ itemId: 8, quantityReceived: -1 }]),
    /non-negative/,
  );
});

test("requires a reason only when reception differs from dispatch", () => {
  assert.equal(requireTransferDiscrepancyReason(false, "ignored"), null);
  assert.equal(requireTransferDiscrepancyReason(true, "  Faltante en transporte  "), "Faltante en transporte");
  assert.throws(() => requireTransferDiscrepancyReason(true, ""), /reason is required/);
});
