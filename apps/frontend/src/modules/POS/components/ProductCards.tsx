import { Chip } from "@heroui/react";
import { Check, LoaderCircle, Plus } from "lucide-react";
import numeral from "numeral";
import { getRecipeAvailability, type Variant } from "../utils/recipeAvailability";

interface ProductCardProps {
  name: string;
  price: number | null;
  image: string;
  variantsInfo?: Variant[];
  productType: string;
  reservedQuantities?: Record<number, number>;
  isAdding?: boolean;
  wasJustAdded?: boolean;
  onAdd: () => void;
}

const ProductCard = ({ name, price, image, variantsInfo, productType, reservedQuantities = {}, isAdding = false, wasJustAdded = false, onAdd }: ProductCardProps) => {
  const activeVariants = (variantsInfo ?? []).filter((variant) => variant.isActive);
  const recipeAvailability = activeVariants.map((variant) => {
    const availability = getRecipeAvailability(variant);
    return { ...availability, remainingUnits: Math.max(0, availability.availableUnits - (reservedQuantities[variant.id] ?? 0)) };
  });
  const isRecipeProduct = productType === "RECIPE_PRODUCT";
  const isUnavailable = isRecipeProduct && (recipeAvailability.length === 0 || recipeAvailability.every((item) => item.remainingUnits === 0));
  const singleAvailability = recipeAvailability[0];
  const availableVariantCount = recipeAvailability.filter((item) => item.remainingUnits > 0).length;

  return (
    <button type="button" onClick={onAdd} disabled={isUnavailable || isAdding} aria-label={`${name}, ${activeVariants.length > 1 ? `${activeVariants.length} variantes` : numeral(price).format("$0,0")}${isUnavailable ? ", no disponible" : ""}`} className={`group relative flex min-h-[270px] flex-col overflow-hidden rounded-[24px] border-2 bg-pos-surface text-left shadow-[0_12px_32px_-24px_rgba(84,56,32,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(84,56,32,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 ${wasJustAdded ? "border-success ring-2 ring-success/20" : "border-border hover:border-primary"}`}>
      <div className="aspect-[4/3] w-full overflow-hidden bg-pos-surface-soft">
        <img src={image} alt={name} loading="lazy" width={512} height={512} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      {isUnavailable && (
        <span className="absolute right-3 top-3 rounded-full border border-destructive bg-destructive px-3 py-1.5 text-sm font-black text-destructive-foreground shadow-md">
          No disponible
        </span>
      )}
      <div className="flex flex-1 items-center justify-between gap-4 p-5">
        <div className="min-w-0 text-left">
          <p className="text-lg font-black leading-tight text-foreground">{name}</p>
          <p className="mt-2 text-xl font-black text-primary">
            {activeVariants.length > 1 ? `${activeVariants.length} variantes` : numeral(price).format("$0,0")}
          </p>
          {activeVariants.length === 1 && !isRecipeProduct && (
            <Chip className={`mt-3 border text-sm font-black ${activeVariants[0].stock > activeVariants[0].minStock ? "border-success/50 bg-success/15 text-foreground" : "border-danger/50 bg-danger/15 text-danger"}`}>
              {`${activeVariants[0].stock} en stock`}
            </Chip>
          )}
          {isRecipeProduct && activeVariants.length === 1 && singleAvailability && (
            <>
              <Chip className={`mt-3 border text-sm font-black ${singleAvailability.remainingUnits === 0 ? "border-danger/50 bg-danger/15 text-danger" : singleAvailability.hasLowStockIngredient ? "border-warning/60 bg-warning/20 text-foreground" : "border-success/50 bg-success/15 text-foreground"}`}>
                {singleAvailability.hasValidRecipe ? `${singleAvailability.remainingUnits} disponibles` : "Receta incompleta"}
              </Chip>
              {singleAvailability.limitingIngredientNames.length > 0 && (
                <p className="mt-2 truncate text-sm font-semibold text-foreground/75">Limita: {singleAvailability.limitingIngredientNames.join(", ")}</p>
              )}
            </>
          )}
          {isRecipeProduct && activeVariants.length > 1 && (
            <Chip className={`mt-3 border text-sm font-black ${availableVariantCount > 0 ? "border-success/50 bg-success/15 text-foreground" : "border-danger/50 bg-danger/15 text-danger"}`}>
              {`${availableVariantCount}/${activeVariants.length} disponibles`}
            </Chip>
          )}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-primary-foreground shadow-sm ${wasJustAdded ? "border-success bg-success" : "border-primary bg-primary"}`}>
          {isAdding ? <LoaderCircle className="h-6 w-6 animate-spin" /> : wasJustAdded ? <Check className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
