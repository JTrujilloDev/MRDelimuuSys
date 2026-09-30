import { ProductType } from "../../generated/prisma/client";

const allowedComponentTypes = new Set<ProductType>([
  ProductType.INGREDIENT,
  ProductType.PREPARED_BASE,
  ProductType.PACKAGING,
]);

export const isRecipeComponentType = (productType: ProductType) =>
  allowedComponentTypes.has(productType);

export const requireRecipeQuantity = (value: unknown) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Recipe quantities must be positive whole units");
  }
  return quantity;
};

export const calculateRecipeCost = (
  components: Array<{ ingredientVariantId: number; quantity: number }>,
  costs: ReadonlyMap<number, number>,
) => {
  const missingComponentIds: number[] = [];
  let cost = 0;
  for (const component of components) {
    const componentCost = costs.get(component.ingredientVariantId);
    if (componentCost === undefined) {
      missingComponentIds.push(component.ingredientVariantId);
      continue;
    }
    cost += componentCost * requireRecipeQuantity(component.quantity);
  }
  return {
    cost: missingComponentIds.length === 0 ? cost : null,
    missingComponentIds,
  };
};
