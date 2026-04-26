import { Chip, Modal } from "@heroui/react";
import numeral from "numeral";

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
}

export interface ProductWithVariants {
  id: number;
  name: string;
  price: number | null;
  category: string;
  image: string;
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
                (variant) =>
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
                      <Chip className={`mt-2 ${variant?.stock > variant.minStock ? "bg-success-soft-hover text-success" : "bg-danger-soft-hover text-danger"}`}>
                        {`${variant?.stock} en stock`}
                      </Chip>
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
