import { Keyboard, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { normalizePosCode, isValidPosCode } from "../../../shared/utils/posCode";
import type { GroupCatalogVariant } from "../catalog.service";

type CatalogProduct = {
  id: number;
  name: string;
  productType: string;
  category: { id: number; name: string };
  variants: GroupCatalogVariant[];
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function PosCodePanel({ products, pending, onSave }: {
  products: CatalogProduct[];
  pending: boolean;
  onSave: (variant: GroupCatalogVariant, code: string | null) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const variants = useMemo(() => products
    .filter((product) => ["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"].includes(product.productType))
    .flatMap((product) => product.variants.map((variant) => ({ product, variant })))
    .filter(({ product, variant }) => !normalizedSearch ||
      `${variant.catalog?.posCode ?? ""} ${product.name} ${variant.name} ${product.category.name}`
        .toLocaleLowerCase("es").includes(normalizedSearch))
    .sort((left, right) => {
      const missingDifference = Number(Boolean(left.variant.catalog?.posCode)) - Number(Boolean(right.variant.catalog?.posCode));
      return missingDifference || `${left.product.name} ${left.variant.name}`.localeCompare(
        `${right.product.name} ${right.variant.name}`,
        "es",
        { sensitivity: "base" },
      );
    }), [normalizedSearch, products]);

  const saleableProducts = products.filter((product) =>
    ["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"].includes(product.productType),
  );
  const configured = saleableProducts.reduce(
    (total, product) => total + product.variants.filter((variant) => variant.catalog?.posCode).length,
    0,
  );
  const total = saleableProducts.reduce((count, product) => count + product.variants.length, 0);

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Keyboard className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-black text-foreground">Códigos rápidos del POS</h3>
            <p className="text-sm text-muted-foreground">
              Asigna un código por variante. Todos los puntos del grupo compartirán esta numeración.
            </p>
          </div>
        </div>
        <p className="rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-black text-primary">
          {configured} de {total} configurados
        </p>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputClass} pl-10`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por producto, variante o código…"
        />
      </div>

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {variants.map(({ product, variant }) => (
          <PosCodeRow
            key={`${variant.id}-${variant.catalog?.updatedAt ?? "catalog"}`}
            productName={product.name}
            variant={variant}
            pending={pending}
            onSave={onSave}
          />
        ))}
        {variants.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-background p-4 text-center text-sm text-muted-foreground">
            No hay productos que coincidan con la búsqueda.
          </p>
        )}
      </div>
    </section>
  );
}

function PosCodeRow({ productName, variant, pending, onSave }: {
  productName: string;
  variant: GroupCatalogVariant;
  pending: boolean;
  onSave: (variant: GroupCatalogVariant, code: string | null) => Promise<void>;
}) {
  const original = variant.catalog?.posCode ?? "";
  const [code, setCode] = useState(original);
  const normalized = normalizePosCode(code);
  const valid = isValidPosCode(code);
  const changed = normalized !== original;

  return (
    <div className="grid items-center gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-foreground">{productName} · {variant.name}</p>
        <p className="text-xs text-muted-foreground">
          {variant.catalog?.isPosActive ? "Disponible en el POS" : "Desactivado en el POS"}
        </p>
      </div>
      <label>
        <span className="sr-only">Código de {productName} {variant.name}</span>
        <input
          className={`${inputClass} uppercase ${valid ? "" : "border-danger focus:border-danger"}`}
          value={code}
          maxLength={20}
          autoComplete="off"
          inputMode="text"
          placeholder="Sin código"
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter" && valid && changed && !pending) {
              event.preventDefault();
              void onSave(variant, normalized || null);
            }
          }}
        />
      </label>
      <button
        type="button"
        className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-40"
        disabled={pending || !valid || !changed}
        onClick={() => void onSave(variant, normalized || null)}
      >
        Guardar
      </button>
      {!valid && <p className="text-xs font-semibold text-danger sm:col-start-2 sm:col-span-2">Usa únicamente letras, números o guiones.</p>}
    </div>
  );
}
