import assert from "node:assert/strict";
import test from "node:test";
import { ProductType } from "../../generated/prisma/client";
import { isRecipeComponentType, requireRecipeQuantity } from "./productRecipe.rules";

test("allows ingredients, prepared bases, and packaging in recipes", () => {
  assert.equal(isRecipeComponentType(ProductType.INGREDIENT), true);
  assert.equal(isRecipeComponentType(ProductType.PREPARED_BASE), true);
  assert.equal(isRecipeComponentType(ProductType.PACKAGING), true);
  assert.equal(isRecipeComponentType(ProductType.FINISHED_PRODUCT), false);
});

test("uses positive whole quantities in the component base unit", () => {
  assert.equal(requireRecipeQuantity("15"), 15);
  assert.throws(() => requireRecipeQuantity(0), /positive whole units/);
  assert.throws(() => requireRecipeQuantity(1.5), /positive whole units/);
});
