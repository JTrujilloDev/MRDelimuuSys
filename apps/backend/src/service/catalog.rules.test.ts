import assert from "node:assert/strict";
import test from "node:test";
import { requireCatalogPrice } from "./catalog.rules";

test("accepts zero and positive catalog prices", () => {
  assert.equal(requireCatalogPrice(0, "group cost"), 0);
  assert.equal(requireCatalogPrice("5500", "sale price"), 5500);
});

test("rejects negative and invalid catalog prices", () => {
  assert.throws(() => requireCatalogPrice(-1, "group cost"), /Valid group cost/);
  assert.throws(() => requireCatalogPrice("not-a-price", "sale price"), /Valid sale price/);
});
