import assert from "node:assert/strict";
import test from "node:test";
import {
  inventoryCountPolicyForGroup,
  operationFeatures,
} from "../config/operationScope";

test("Delimuu uses flexible inventory counts while other groups remain strict", () => {
  assert.equal(inventoryCountPolicyForGroup("DELIMUU"), "FLEXIBLE");
  assert.equal(inventoryCountPolicyForGroup(" delimuu "), "FLEXIBLE");
  assert.equal(inventoryCountPolicyForGroup("VELENO"), "STRICT");
  assert.equal(inventoryCountPolicyForGroup(undefined), "STRICT");
});

test("suspended modules remain disabled while the inventory policy changes", () => {
  assert.deepEqual(operationFeatures, {
    customers: false,
    electronicBilling: false,
    inventoryTransfers: false,
  });
});

