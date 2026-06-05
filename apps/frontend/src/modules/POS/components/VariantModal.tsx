import { Chip, Modal } from "@heroui/react";
import numeral from "numeral";
import { useMemo } from "react";

export interface Variant {
  createdAt: string;
  id: number;
  isActive: boolean;
  minStock: number;
  name: string;
  productCost: string;
  productId: number;
  retailPrice: number;
  stock: number;
  wholesalePrice: number;
  recipeItems?: RecipeItem[];
}

interface RecipeItem {
  name: string;
  quantity: number;
  ingredientVariant: Variant;
}

export interface ProductWithVariants {
  id: number;
  name: string;
  price: number | null;
  category: string;
  image: string;
  productType: string;
  variants?: Variant[];
}

interface VariantModalProps {
  product: ProductWithVariants | null;
  open: boolean;
  onClose: () => void;
  onSelectVariant: (product: ProductWithVariants, variant: Variant) => void;
}

const VariantModal = ({
  product,
  open,
  onClose,
  onSelectVariant,
}: VariantModalProps) => {
  if (!open || !product || !product.variants) return null;

 const stockInfo = useMemo(() => {
  if (product.productType !== "RECIPE_PRODUCT" || !product?.variants) return [];

  return product?.variants.map(
    (variant) =>
      variant.recipeItems?.map((recipeItem) => {
        const maxUnits =
          recipeItem.quantity > 0
            ? recipeItem.ingredientVariant.stock / recipeItem.quantity
            : 0;

        const availableUnits = Math.floor(maxUnits);

        return {
          name: recipeItem.ingredientVariant.product.name,
          maxUnits: availableUnits,
          chipColor:
            availableUnits === 0
              ? "bg-[#ef4444]/20 text-[#ef4444]"
              : availableUnits <= variant.minStock
                ? "bg-[#facc15]/20 text-[#ca8a04]"
                : "bg-[#10b981]/20 text-[#10b981]",
        };
      }) ?? [],
  );
}, [product]);


  return (
    <Modal>
      <Modal.Backdrop isOpen={open}>
        <Modal.Container size="lg">
          <Modal.Dialog className="w-full max-w-2xl rounded-[28px] bg-pos-surface">
            <Modal.CloseTrigger onClick={onClose} className="bg-white" />
            <Modal.Header className="px-6 pt-6 text-xl font-bold sm:text-2xl">
              Selecciona una variante
            </Modal.Header>
            <Modal.Body className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
              {product.variants.map(
                (variant, index) =>
                  variant.isActive && (
                    <button
                      key={variant.id}
                      onClick={() => {
                        onSelectVariant(product, variant);
                        onClose();
                      }}
                      className="flex min-h-28 flex-col items-center justify-center rounded-[20px] border border-border bg-secondary/50 px-4 py-5 text-center transition-all hover:border-primary/30 hover:bg-primary/10 hover:shadow-md active:scale-[0.97]"
                    >
                      <span className="text-sm font-semibold text-foreground sm:text-base">
                        {variant.name}
                      </span>
                      <span className="mt-1 text-base font-bold text-primary sm:text-lg">
                        {numeral(variant?.retailPrice).format("$ 0,0")}
                      </span>
                      {
                        product.productType !== "RECIPE_PRODUCT" ? (
                          <Chip
                        className={`mt-2 ${variant?.stock > variant.minStock ? "bg-success-soft-hover text-success" : "bg-danger-soft-hover text-danger"}`}
                      >
                        {`${variant?.stock} en stock`}
                      </Chip>
                        ) : (
                          stockInfo[index]?.map((item, index) => (
                            <Chip
                              key={index}
                              className={`mt-2 ${item.chipColor}`}
                            >
                              {`${item.name}: ${item.maxUnits}`}
                            </Chip>
                          ))
                        )
                      }
                      
                    </button>
                  ),
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default VariantModal;
