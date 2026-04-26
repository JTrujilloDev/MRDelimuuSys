import { Chip } from "@heroui/react";
import { Plus } from "lucide-react";
import numeral from "numeral";

interface ProductCardProps {
  name: string;
  price: number | null;
  image: string;
  variantsInfo?: VariantInfo[];
  onAdd: () => void;
}

interface VariantInfo {
  name: string;
  price: number;
  quantity: number;
  stock: number;
  minStock: number;
}

const ProductCard = ({
  name,
  price,
  image,
  variantsInfo,
  onAdd,
}: ProductCardProps) => {
  return (
    <button
      onClick={onAdd}
      className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-[24px] border border-border/70 bg-pos-surface shadow-[0_12px_32px_-24px_rgba(84,56,32,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-24px_rgba(84,56,32,0.45)] active:scale-[0.98]"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-pos-surface-soft">
        <img
          src={image}
          alt={name}
          loading="lazy"
          width={512}
          height={512}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 p-4">
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight text-foreground sm:text-[15px]">
            {name}
          </p>
          <p className="mt-1 text-base font-bold text-primary">
            {variantsInfo?.length && variantsInfo.length > 1
              ? `${variantsInfo.length} variantes`
              : numeral(price).format("$0,0")}
          </p>
          {variantsInfo?.length === 1 && (
            <Chip
              className={`mt-2 ${variantsInfo[0].stock > variantsInfo[0]?.minStock ? "bg-success-soft-hover text-success" : "bg-danger-soft-hover text-danger"}`}
            >
              {`${variantsInfo[0].stock} en stock`}
            </Chip>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground opacity-80 transition-opacity group-hover:opacity-100">
          <Plus className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
