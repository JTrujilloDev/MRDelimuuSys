import { useState } from "react";
import { Chip, Modal } from "@heroui/react";
import { Check, LoaderCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import numeral from "numeral";
import {
  getRecipeAvailability,
  type ProductWithVariants,
  type Variant,
} from "../utils/recipeAvailability";

export type { ProductWithVariants, Variant } from "../utils/recipeAvailability";

interface VariantModalProps {
  product: ProductWithVariants | null;
  open: boolean;
  reservedQuantities?: Record<number, number>;
  pendingVariantId?: number;
  recentlyAddedVariantId?: number;
  onClose: () => void;
  onSelectVariant: (
    product: ProductWithVariants,
    variant: Variant,
    quantity: number,
  ) => void;
}

const VariantModal = ({
  product,
  open,
  reservedQuantities = {},
  pendingVariantId,
  recentlyAddedVariantId,
  onClose,
  onSelectVariant,
}: VariantModalProps) => {
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  if (!open || !product?.variants) return null;

  return (
    <Modal>
      <Modal.Backdrop isOpen={open}>
        <Modal.Container size="xl">
          <Modal.Dialog className="max-h-[calc(100dvh-3rem)] w-full max-w-4xl overflow-hidden rounded-[28px] bg-pos-surface">
            <Modal.CloseTrigger onClick={onClose} className="bg-white" />
            <Modal.Header className="px-6 pt-6">
              <div>
                <Modal.Heading className="text-xl font-black sm:text-2xl">
                  Selecciona una variante
                </Modal.Heading>
                <p className="mt-2 text-base font-medium text-foreground/75">
                  Define la cantidad antes de agregarla a la cuenta.
                </p>
              </div>
            </Modal.Header>
            <Modal.Body className="grid min-h-0 grid-cols-[repeat(auto-fit,minmax(250px,1fr))] items-stretch gap-5 overflow-y-auto p-6">
              {product.variants
                .filter((variant) => variant.isActive)
                .sort((first, second) =>
                  first.name.localeCompare(second.name, "es", {
                    sensitivity: "base",
                  }),
                )
                .map((variant) => {
                  const isRecipeProduct =
                    product.productType === "RECIPE_PRODUCT";
                  const availability = getRecipeAvailability(variant);
                  const remainingUnits = Math.max(
                    0,
                    availability.availableUnits -
                      (reservedQuantities[variant.id] ?? 0),
                  );
                  const isUnavailable =
                    isRecipeProduct && remainingUnits === 0;
                  const quantity = Math.max(1, quantities[variant.id] ?? 1);
                  const maxQuantity = isRecipeProduct
                    ? remainingUnits
                    : Number.POSITIVE_INFINITY;
                  const isAdding = pendingVariantId === variant.id;
                  const wasAdded = recentlyAddedVariantId === variant.id;

                  return (
                    <div
                      key={variant.id}
                      className={`flex min-h-72 flex-col rounded-[22px] border-2 p-5 transition ${
                        wasAdded
                          ? "border-success/50 bg-success/10"
                          : "border-border bg-secondary/40"
                      } ${isUnavailable ? "opacity-55" : ""}`}
                    >
                      <div className="flex-1 text-center">
                        <p className="line-clamp-2 min-h-14 text-lg font-black leading-7 text-foreground">
                          {variant.name}
                        </p>
                        <p className="mt-2 text-2xl font-black text-primary">
                          {numeral(variant.retailPrice).format("$ 0,0")}
                        </p>
                        {!isRecipeProduct ? (
                          <Chip
                            className={`mt-3 border text-sm font-black ${variant.stock > variant.minStock ? "border-success/50 bg-success/15 text-foreground" : "border-danger/50 bg-danger/15 text-danger"}`}
                          >
                            {`${variant.stock} en stock`}
                          </Chip>
                        ) : (
                          <Chip
                            className={`mt-3 border text-sm font-black ${remainingUnits === 0 ? "border-danger/50 bg-danger/15 text-danger" : availability.hasLowStockIngredient ? "border-warning/60 bg-warning/20 text-foreground" : "border-success/50 bg-success/15 text-foreground"}`}
                          >
                            {availability.hasValidRecipe
                              ? `${remainingUnits} disponibles`
                              : "Receta incompleta"}
                          </Chip>
                        )}
                        {isRecipeProduct &&
                          availability.limitingIngredientNames.length > 0 && (
                            <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground/75">
                              Limita: {availability.limitingIngredientNames.join(", ")}
                            </p>
                          )}
                      </div>

                      <div className="mt-4 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-border bg-secondary/80 p-2 shadow-inner">
                        <button
                          type="button"
                          aria-label={`Reducir cantidad de ${variant.name}`}
                          disabled={quantity <= 1 || isAdding || isUnavailable}
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [variant.id]: quantity - 1,
                            }))
                          }
                          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground/30 bg-pos-surface text-foreground shadow-sm transition hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
                        >
                          <Minus className="h-6 w-6 stroke-[3]" />
                        </button>
                        <span className="flex h-12 min-w-14 items-center justify-center rounded-xl bg-background px-3 text-xl font-black text-foreground ring-2 ring-border">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aumentar cantidad de ${variant.name}`}
                          disabled={
                            quantity >= maxQuantity || isAdding || isUnavailable
                          }
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [variant.id]: quantity + 1,
                            }))
                          }
                          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-primary bg-primary text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
                        >
                          <Plus className="h-6 w-6 stroke-[3]" />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isUnavailable || isAdding}
                        onClick={() =>
                          onSelectVariant(product, variant, quantity)
                        }
                        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-black text-primary-foreground transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isAdding ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : wasAdded ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                        {isAdding
                          ? "Agregando…"
                          : wasAdded
                            ? "Agregado"
                            : `Agregar ${quantity}`}
                      </button>
                    </div>
                  );
                })}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default VariantModal;
