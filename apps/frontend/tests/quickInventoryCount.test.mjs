import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCountQuantity } from "../src/modules/POS/utils/quickInventoryCount.rules.ts";

test("empty and invalid quantities remain pending, not zero", () => {
  for (const value of ["", " ", "-1", "1.5", "1,5", "1e3", "Infinity", "NaN", "2147483648", "9007199254740992"]) {
    assert.equal(parseCountQuantity(value), null, value);
  }
});

test("explicit zero and nonnegative integer counts are accepted", () => {
  for (const value of ["0", "1", "10", "0003", "2147483647"]) {
    assert.equal(parseCountQuantity(value), Number(value));
  }
});
