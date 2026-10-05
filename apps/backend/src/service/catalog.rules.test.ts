import assert from "node:assert/strict";
import test from "node:test";
import { requireCatalogPrice, requirePosCode } from "./catalog.rules";

test("accepts zero and positive catalog prices", () => {
  assert.equal(requireCatalogPrice(0, "group cost"), 0);
  assert.equal(requireCatalogPrice("5500", "sale price"), 5500);
});

test("rejects negative and invalid catalog prices", () => {
  assert.throws(() => requireCatalogPrice(-1, "group cost"), /Valid group cost/);
  assert.throws(() => requireCatalogPrice("not-a-price", "sale price"), /Valid sale price/);
});

test("normalizes POS codes while preserving leading zeroes", () => {
  assert.equal(requirePosCode(" 001 "), "001");
  assert.equal(requirePosCode("a-15"), "A-15");
  assert.equal(requirePosCode(""), null);
  assert.equal(requirePosCode(null), null);
});

test("rejects ambiguous POS code characters and excessive length", () => {
  assert.throws(() => requirePosCode("10 1"), /código POS/);
  assert.throws(() => requirePosCode("CODIGO_DE_PRODUCTO_123"), /código POS/);
});
