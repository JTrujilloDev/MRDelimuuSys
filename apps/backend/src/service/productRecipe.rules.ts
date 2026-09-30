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
