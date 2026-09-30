import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCancellationRegisterReversal,
  requireCancellationReason,
} from "./saleCancellation.rules";

test("requires and normalizes a sale cancellation reason", () => {
  assert.equal(requireCancellationReason("  Cobro duplicado  "), "Cobro duplicado");
  assert.throws(() => requireCancellationReason(" "), /required/);
  assert.throws(() => requireCancellationReason(null), /required/);
});

test("reverses net sale, discount, and the original payment method", () => {
  assert.deepEqual(buildCancellationRegisterReversal(4, 7_000, 2_000, "CASH"), {
    cashRegisterId: 4,
    saleAmount: -7_000,
    discountAmount: -2_000,
    cashAmount: -7_000,
  });
  assert.deepEqual(buildCancellationRegisterReversal(4, 0, 7_000, "QR"), {
    cashRegisterId: 4,
    saleAmount: -0,
    discountAmount: -7_000,
    qrAmount: -0,
  });
});
