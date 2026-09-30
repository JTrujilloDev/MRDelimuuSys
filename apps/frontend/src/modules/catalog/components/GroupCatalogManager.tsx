import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CircleDollarSign, PackagePlus, Search, Trash2 } from "lucide-react";
import numeral from "numeral";
import { useMemo, useState } from "react";
import { useAuth } from "../../../app/auth/AuthProvider";
import {
  deleteGroupCatalogItem,
  getCatalogGroups,
  getGroupCatalog,
  updateGroupCatalogItem,
  type GroupCatalogVariant,
} from "../catalog.service";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const saleableTypes = new Set(["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"]);

const errorMessage = (error: unknown) =>
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? "No fue posible guardar los cambios"
    : "No fue posible guardar los cambios";

export default function GroupCatalogManager() {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const canManage = Boolean(state?.user.isGlobalAdmin);
  const activeGroupId = state?.activeContext?.store.groupId;
  const groupsQuery = useQuery({
    queryKey: ["catalog", "groups"],
    queryFn: getCatalogGroups,
    enabled: canManage,
  });
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const groupId = canManage
    ? selectedGroupId ?? groupsQuery.data?.[0]?.id ?? null
    : activeGroupId ?? null;
  const catalogQuery = useQuery({
    queryKey: ["catalog", "group", groupId],
    queryFn: () => getGroupCatalog(groupId!),
    enabled: Boolean(groupId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catalog", "group", groupId] });

  const saveMutation = useMutation({
    mutationFn: ({ variantId, salePrice, costPrice, isActive }: {
      variantId: number;
      salePrice: number;
      costPrice: number;
      isActive: boolean;
    }) => updateGroupCatalogItem(groupId!, variantId, { salePrice, costPrice, isActive }),
  });
  const deleteMutation = useMutation({
    mutationFn: (variantId: number) => deleteGroupCatalogItem(groupId!, variantId),
  });

  const products = useMemo(() => catalogQuery.data?.products ?? [], [catalogQuery.data?.products]);
  const includedProducts = useMemo(() => products
    .map((product) => ({ ...product, variants: product.variants.filter((variant) => variant.catalog) }))
    .filter((product) => product.variants.length > 0), [products]);
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const candidates = useMemo(() => {
    if (!normalizedSearch) return [];
    return products.flatMap((product) => {
      if (!saleableTypes.has(product.productType)) return [];
      return product.variants
        .filter((variant) => variant.isActive && !variant.catalog)
        .filter((variant) => `${product.name} ${variant.name} ${product.category.name}`
          .toLocaleLowerCase("es").includes(normalizedSearch))
        .map((variant) => ({ product, variant }));
    });
  }, [normalizedSearch, products]);

  const save = async (
    variant: GroupCatalogVariant,
    values: { salePrice: number; costPrice: number; isActive: boolean },
    isNew: boolean,
  ) => {
    setError("");
    setNotice("");
    try {
      await saveMutation.mutateAsync({ variantId: variant.id, ...values });
      await refresh();
      setSearch("");
      setNotice(`${variant.name} fue ${isNew ? "agregada al" : "actualizada en el"} catálogo.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const remove = async (variant: GroupCatalogVariant) => {
    if (!window.confirm(`¿Eliminar ${variant.name} de este grupo empresarial?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteMutation.mutateAsync(variant.id);
      await refresh();
      setNotice(`${variant.name} fue retirada del catálogo empresarial.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (!groupId && !groupsQuery.isLoading) return <p>No hay grupos empresariales configurados.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-pos-surface p-4 shadow-sm">
        {canManage && (
          <label className="min-w-60 text-sm">
            <span className="mb-1 block font-bold">Grupo empresarial</span>
            <select
              className={inputClass}
              value={groupId ?? ""}
              onChange={(event) => {
                setSelectedGroupId(Number(event.target.value));
                setSearch("");
                setError("");
                setNotice("");
              }}
            >
              {(groupsQuery.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Catálogo empresarial</p>
          <h2 className="text-xl font-black">{catalogQuery.data?.group.name ?? "Cargando…"}</h2>
          <p className="text-sm text-muted-foreground">
            Sus puntos comparten estas variantes y PVP; el inventario continúa separado.
          </p>
        </div>
      </div>

      {canManage && (
        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <label className="text-sm font-bold" htmlFor="catalog-product-search">Agregar desde el catálogo maestro</label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="catalog-product-search"
              className={`${inputClass} pl-10`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto, presentación o categoría…"
            />
          </div>
          {normalizedSearch && (
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {candidates.map(({ product, variant }) => (
                <CatalogVariantRow
                  key={variant.id}
                  productName={product.name}
                  variant={variant}
                  isNew
                  isPending={saveMutation.isPending}
                  onSave={(values) => void save(variant, values, true)}
                />
              ))}
              {candidates.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No hay variantes disponibles que coincidan con la búsqueda.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {notice && <p className="rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">{notice}</p>}
      {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {catalogQuery.isLoading ? <p>Cargando catálogo…</p> : (
          <div className="space-y-4 pb-2">
            {includedProducts.map((product) => (
              <article key={product.id} className="rounded-2xl border border-border bg-pos-surface p-5 shadow-sm">
                <div className="mb-3">
                  <h3 className="font-black">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.category.name}</p>
                </div>
                <div className="space-y-2">
                  {product.variants.map((variant) => canManage ? (
                    <CatalogVariantRow
                      key={`${variant.id}-${variant.catalog?.updatedAt ?? "catalog"}`}
                      productName={product.name}
                      variant={variant}
                      isPending={saveMutation.isPending || deleteMutation.isPending}
                      onSave={(values) => void save(variant, values, false)}
                      onDelete={() => void remove(variant)}
                    />
                  ) : (
                    <div key={variant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                      <div>
                        <p className="text-sm font-black">{variant.name}</p>
                        <p className="text-xs text-muted-foreground">{variant.catalog?.isActive ? "Disponible en el POS" : "Desactivada"}</p>
                      </div>
                      <p className="font-black">{numeral(variant.catalog?.salePrice).format("$0,0")}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {includedProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <PackagePlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-bold">Este grupo todavía no tiene productos.</p>
                {canManage && <p className="text-sm text-muted-foreground">Utiliza la búsqueda para agregar su primera variante.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogVariantRow({ productName, variant, isNew = false, isPending, onSave, onDelete }: {
  productName: string;
  variant: GroupCatalogVariant;
  isNew?: boolean;
  isPending: boolean;
  onSave: (values: { salePrice: number; costPrice: number; isActive: boolean }) => void;
  onDelete?: () => void;
}) {
  const [salePrice, setSalePrice] = useState(String(variant.catalog?.salePrice ?? ""));
  const [costPrice, setCostPrice] = useState(String(variant.catalog?.costPrice ?? variant.productCost ?? 0));
  const [isActive, setIsActive] = useState(variant.catalog?.isActive ?? true);
  const sale = Number(salePrice);
  const cost = Number(costPrice);
  const isValid = Number.isFinite(sale) && sale >= 0 && Number.isFinite(cost) && cost >= 0;
  const margin = sale - cost;

  return (
    <div className="grid items-end gap-3 rounded-xl border border-border bg-background p-3 xl:grid-cols-[minmax(180px,1fr)_150px_150px_150px_auto]">
      <div>
        {isNew && <p className="truncate text-xs text-muted-foreground">{productName}</p>}
        <p className="text-sm font-black">{variant.name}</p>
        <button
          type="button"
          className="mt-1 text-xs font-bold text-primary hover:underline"
          onClick={() => setCostPrice(String(variant.productCost ?? 0))}
        >
          Usar costo base ({numeral(variant.productCost ?? 0).format("$0,0")})
        </button>
      </div>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold">Costo del grupo</span>
        <input className={inputClass} type="number" min="0" step="0.01" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold">PVP</span>
        <input className={inputClass} type="number" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
      </label>
      <div className="h-10 rounded-xl border border-border px-3 py-2 text-sm">
        <span className="mr-2 text-xs text-muted-foreground">Margen</span>
        <span className={`font-black ${margin < 0 ? "text-danger" : "text-success"}`}>
          {isValid ? numeral(margin).format("$0,0") : "—"}
        </span>
      </div>
      <div className="flex items-center justify-end gap-2">
        {!isNew && (
          <button
            type="button"
            className={`h-10 rounded-xl border px-3 text-xs font-black ${isActive ? "border-success/30 bg-success/10 text-success" : "border-border bg-secondary text-muted-foreground"}`}
            onClick={() => setIsActive((active) => !active)}
          >
            {isActive ? "Activa" : "Inactiva"}
          </button>
        )}
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-40"
          disabled={isPending || !isValid || salePrice === ""}
          onClick={() => onSave({ salePrice: sale, costPrice: cost, isActive })}
        >
          {isNew && <CircleDollarSign className="h-4 w-4" />}
          {isNew ? "Agregar" : "Guardar"}
        </button>
        {onDelete && (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Eliminar ${variant.name} del grupo`}
            title="Eliminar del grupo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
