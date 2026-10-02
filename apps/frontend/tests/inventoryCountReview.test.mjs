import { test } from "node:test";
import assert from "node:assert/strict";
import { orderInventoryCountReview } from "../src/modules/POS/utils/inventoryCountReview.rules.ts";

test("review puts unresolved shortages and surpluses before resolved differences and matches", () => {
  const products = [1, 2, 3, 4, 5, 6].map(productVariantId => ({ productVariantId }));
  const items = [
    { productVariantId: 1, difference: 0, resolution: null },
    { productVariantId: 2, difference: -1, resolution: "EXPLAINED" },
    { productVariantId: 3, difference: 2, resolution: null },
    { productVariantId: 4, difference: -3, resolution: null },
    { productVariantId: 5, difference: 1, resolution: "COUNT_ERROR" },
  ];
  assert.deepEqual(orderInventoryCountReview(products, items).map(p => p.productVariantId), [3, 4, 2, 5, 1, 6]);
  assert.deepEqual(products.map(p => p.productVariantId), [1, 2, 3, 4, 5, 6]);
  assert.equal(items[1].resolution, "EXPLAINED");
});

test("empty or matching counts preserve the original order", () => {
  assert.deepEqual(orderInventoryCountReview([], []), []);
  const products = [{ productVariantId: 2 }, { productVariantId: 1 }];
  assert.deepEqual(orderInventoryCountReview(products, []), products);
  assert.deepEqual(orderInventoryCountReview(products, products.map(p => ({ ...p, difference: 0, resolution: null }))), products);
});
