import assert from "node:assert/strict";
import test from "node:test";
import { requireCancellationReason } from "./saleCancellation.rules";

test("requires and normalizes a sale cancellation reason", () => {
  assert.equal(requireCancellationReason("  Cobro duplicado  "), "Cobro duplicado");
  assert.throws(() => requireCancellationReason(" "), /required/);
  assert.throws(() => requireCancellationReason(null), /required/);
});
