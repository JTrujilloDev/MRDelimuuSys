import assert from "node:assert/strict";
import test from "node:test";
import { isValidPosCode, normalizePosCode, parseQuickQuantity } from "../src/shared/utils/posCode.ts";

test("POS codes are normalized without losing leading zeroes", () => {
  assert.equal(normalizePosCode(" 001 "), "001");
  assert.equal(normalizePosCode("a-15"), "A-15");
  assert.equal(isValidPosCode("A-15"), true);
  assert.equal(isValidPosCode("10 1"), false);
});

test("quick quantities accept only positive whole numbers", () => {
  assert.equal(parseQuickQuantity("1"), 1);
  assert.equal(parseQuickQuantity("003"), 3);
  assert.equal(parseQuickQuantity("0"), null);
  assert.equal(parseQuickQuantity("1.5"), null);
  assert.equal(parseQuickQuantity(""), null);
});
