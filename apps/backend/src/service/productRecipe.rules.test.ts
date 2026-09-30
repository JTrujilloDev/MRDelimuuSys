import assert from "node:assert/strict";
import test from "node:test";
import { ProductType } from "../../generated/prisma/client";
import { calculateRecipeCost, isRecipeComponentType, requireRecipeQuantity } from "./productRecipe.rules";

test("allows ingredients, prepared bases, and packaging in recipes", () => {
  assert.equal(isRecipeComponentType(ProductType.INGREDIENT), true);
  assert.equal(isRecipeComponentType(ProductType.PREPARED_BASE), true);
  assert.equal(isRecipeComponentType(ProductType.PACKAGING), true);
  assert.equal(isRecipeComponentType(ProductType.FINISHED_PRODUCT), false);
});

test("calculates recipe cost from the group cost of every component", () => {
  const result = calculateRecipeCost(
    [
      { ingredientVariantId: 1, quantity: 10 },
      { ingredientVariantId: 2, quantity: 1 },
    ],
    new Map([[1, 80], [2, 300]]),
  );
  assert.deepEqual(result, { cost: 1100, missingComponentIds: [] });
});

test("does not estimate a recipe with components outside the group", () => {
  const result = calculateRecipeCost(
    [{ ingredientVariantId: 9, quantity: 1 }],
    new Map(),
  );
  assert.deepEqual(result, { cost: null, missingComponentIds: [9] });
});

test("uses positive whole quantities in the component base unit", () => {
  assert.equal(requireRecipeQuantity("15"), 15);
  assert.throws(() => requireRecipeQuantity(0), /positive whole units/);
  assert.throws(() => requireRecipeQuantity(1.5), /positive whole units/);
});
