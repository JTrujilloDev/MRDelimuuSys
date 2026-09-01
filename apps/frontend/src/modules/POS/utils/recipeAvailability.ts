export interface IngredientVariant {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  product?: { id?: number; name: string };
}

export interface RecipeItem {
  id?: number;
  ingredientVariantId?: number;
  quantity: number;
  ingredientVariant: IngredientVariant;
}

export interface Variant {
  createdAt?: string;
  id: number;
  isActive: boolean;
  minStock: number;
  name: string;
  productCost: number | string;
  productId: number;
  retailPrice: number;
  stock: number;
  wholesalePrice: number;
  requirePreparation?: boolean;
  recipeItems?: RecipeItem[];
}

export interface ProductWithVariants {
  id: number;
  name: string;
  price?: number | null;
  category?: string;
  image?: string;
  productType: string;
  variants?: Variant[];
}

export interface RecipeAvailability {
  availableUnits: number;
  hasValidRecipe: boolean;
  hasLowStockIngredient: boolean;
  limitingIngredientNames: string[];
}

export const getRecipeAvailability = (
  variant: Pick<Variant, "recipeItems">,
): RecipeAvailability => {
  const recipeItems = variant.recipeItems ?? [];
  const validItems = recipeItems.filter(
    (item) =>
      Number(item.quantity) > 0 &&
      item.ingredientVariant != null &&
      Number.isFinite(Number(item.ingredientVariant.stock)),
  );

  if (recipeItems.length === 0 || validItems.length !== recipeItems.length) {
    return {
      availableUnits: 0,
      hasValidRecipe: false,
      hasLowStockIngredient: false,
      limitingIngredientNames: [],
    };
  }

  const itemAvailability = validItems.map((item) => ({
    name: item.ingredientVariant.product?.name ?? item.ingredientVariant.name,
    units: Math.max(
      0,
      Math.floor(
        Number(item.ingredientVariant.stock) / Number(item.quantity),
      ),
    ),
    isLowStock:
      Number(item.ingredientVariant.stock) <=
      Number(item.ingredientVariant.minStock ?? 0),
  }));
  const availableUnits = Math.min(...itemAvailability.map((item) => item.units));

  return {
    availableUnits,
    hasValidRecipe: true,
    hasLowStockIngredient: itemAvailability.some((item) => item.isLowStock),
    limitingIngredientNames: itemAvailability
      .filter((item) => item.units === availableUnits)
      .map((item) => item.name),
  };
};

export const getRemainingRecipeUnits = (
  variant: Pick<Variant, "recipeItems">,
  reservedQuantity = 0,
) => Math.max(0, getRecipeAvailability(variant).availableUnits - reservedQuantity);
