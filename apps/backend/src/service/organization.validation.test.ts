import assert from "node:assert/strict";
import test from "node:test";
import {
  requireCode,
  requireKitchenMode,
  requireName,
  requirePositiveId,
} from "./organization.validation";

test("normalizes stable organization codes", () => {
  assert.equal(requireCode("  veleno_point_1 "), "VELENO_POINT_1");
  assert.throws(() => requireCode("Veleño 1"), /only contain/);
  assert.throws(() => requireCode(""), /required/);
});

test("validates organization names and identifiers", () => {
  assert.equal(requireName("  Veleño 1  "), "Veleño 1");
  assert.equal(requirePositiveId("3", "storeId"), 3);
  assert.throws(() => requirePositiveId(0, "storeId"), /positive integer/);
});

test("accepts only supported kitchen modes", () => {
  assert.equal(requireKitchenMode("NONE"), "NONE");
  assert.equal(requireKitchenMode("TICKETS"), "TICKETS");
  assert.throws(() => requireKitchenMode("EXTERNAL"), /Invalid kitchen mode/);
});

