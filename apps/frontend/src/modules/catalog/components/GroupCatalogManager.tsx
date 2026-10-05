import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import axios from "axios";
import { CircleDollarSign, PackagePlus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import numeral from "numeral";
import { useMemo, useState } from "react";
import { useAuth } from "../../../app/auth/AuthProvider";
import { isValidPosCode, normalizePosCode } from "../../../shared/utils/posCode";
import {
  deleteGroupCatalogItem,
  getCatalogGroups,
  getGroupCatalog,
  updateGroupCatalogItem,
  type GroupCatalogVariant,
} from "../catalog.service";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-secondary/50 disabled:text-muted-foreground";
const saleableTypes = new Set(["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"]);

type CatalogValues = {
  posCode: string | null;
  salePrice: number | null;
  costPrice: number;
  isPosActive: boolean;
};

type CatalogRow = {
  productName: string;
  productType: string;
  categoryName: string;
  variant: GroupCatalogVariant;
};

const errorMessage = (error: unknown) =>
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? "No fue posible guardar los cambios"
    : error instanceof Error
      ? error.message
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
  const [masterSearch, setMasterSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const groupId = canManage
    ? selectedGroupId ?? activeGroupId ?? groupsQuery.data?.[0]?.id ?? null
    : activeGroupId ?? null;
  const catalogQuery = useQuery({
    queryKey: ["catalog", "group", groupId],
    queryFn: () => getGroupCatalog(groupId!),
    enabled: Boolean(groupId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catalog", "group", groupId] });

  const saveMutation = useMutation({
    mutationFn: ({ variantId, ...values }: CatalogValues & { variantId: number }) =>
      updateGroupCatalogItem(groupId!, variantId, values),
  });
  const deleteMutation = useMutation({
    mutationFn: (variantId: number) => deleteGroupCatalogItem(groupId!, variantId),
  });

  const products = useMemo(() => catalogQuery.data?.products ?? [], [catalogQuery.data?.products]);
  const catalogRows = useMemo<CatalogRow[]>(() => products
    .flatMap((product) => product.variants
      .filter((variant) => variant.catalog)
      .map((variant) => ({
        productName: product.name,
        productType: product.productType,
        categoryName: product.category.name,
        variant,
      }))), [products]);
  const normalizedCatalogSearch = catalogSearch.trim().toLocaleLowerCase("es");
  const filteredCatalogRows = useMemo(() => catalogRows
    .filter((row) => !normalizedCatalogSearch ||
      `${row.variant.catalog?.posCode ?? ""} ${row.productName} ${row.variant.name} ${row.categoryName}`
        .toLocaleLowerCase("es").includes(normalizedCatalogSearch))
    .sort((left, right) => {
      const missingCodeDifference = Number(Boolean(left.variant.catalog?.posCode)) -
        Number(Boolean(right.variant.catalog?.posCode));
      return missingCodeDifference || `${left.productName} ${left.variant.name}`.localeCompare(
        `${right.productName} ${right.variant.name}`,
        "es",
        { sensitivity: "base" },
      );
    }), [catalogRows, normalizedCatalogSearch]);

  const normalizedMasterSearch = masterSearch.trim().toLocaleLowerCase("es");
  const candidates = useMemo(() => {
    if (!normalizedMasterSearch) return [];
    return products.flatMap((product) => product.variants
      .filter((variant) => variant.isActive && !variant.catalog)
      .filter((variant) => `${product.name} ${variant.name} ${product.category.name}`
        .toLocaleLowerCase("es").includes(normalizedMasterSearch))
      .map((variant) => ({ product, variant })));
  }, [normalizedMasterSearch, products]);

  const configuredCodes = catalogRows.filter((row) => row.variant.catalog?.posCode).length;

  const save = async (variant: GroupCatalogVariant, values: CatalogValues, isNew: boolean) => {
    try {
      const savedItem = await saveMutation.mutateAsync({ variantId: variant.id, ...values });
      if ((savedItem.posCode ?? null) !== values.posCode) {
        throw new Error(
          "El servidor no confirmó el código POS. Reinicia el backend y vuelve a intentarlo.",
        );
      }
      await refresh();
      if (isNew) setMasterSearch("");
      toast(`${variant.name} fue ${isNew ? "agregada al" : "actualizada en el"} catálogo`, {
        variant: "success",
      });
    } catch (requestError) {
      toast("No fue posible guardar los cambios", {
        variant: "danger",
        description: errorMessage(requestError),
      });
    }
  };

  const remove = async (variant: GroupCatalogVariant) => {
    if (!window.confirm(`¿Eliminar ${variant.name} de este grupo empresarial?`)) return;
    try {
      await deleteMutation.mutateAsync(variant.id);
      await refresh();
      toast(`${variant.name} fue retirada del catálogo empresarial`, { variant: "success" });
    } catch (requestError) {
      toast("No fue posible retirar el producto", {
        variant: "danger",
        description: errorMessage(requestError),
      });
    }
  };

  if (!groupId && !groupsQuery.isLoading) return <p>No hay grupos empresariales configurados.</p>;

  return (
    <div className="flex min-h-full flex-col gap-5 pb-2">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-pos-surface p-4 shadow-sm">
        {canManage && (
          <label className="min-w-60 text-sm">
            <span className="mb-1 block font-bold">Grupo empresarial</span>
            <select
              className={inputClass}
              value={groupId ?? ""}
              onChange={(event) => {
                setSelectedGroupId(Number(event.target.value));
                setMasterSearch("");
                setCatalogSearch("");
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
            Sus puntos comparten productos, precios y códigos; el inventario continúa separado.
          </p>
        </div>
        <div className="flex gap-2 text-center text-xs">
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <strong className="block text-base text-foreground">{catalogRows.length}</strong>
            variantes
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-primary">
            <strong className="block text-base">{configuredCodes}</strong>
            con código
          </div>
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
              value={masterSearch}
              onChange={(event) => setMasterSearch(event.target.value)}
              placeholder="Buscar producto, presentación o categoría…"
            />
          </div>
          {normalizedMasterSearch && (
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {candidates.map(({ product, variant }) => (
                <CatalogCandidateRow
                  key={variant.id}
                  productName={product.name}
                  productType={product.productType}
                  variant={variant}
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

      <section className="rounded-2xl border border-border bg-pos-surface shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="font-black text-foreground">Productos del grupo</h3>
            <p className="text-sm text-muted-foreground">
              Edita directamente cada fila. Los cambios no se aplican hasta presionar Guardar.
            </p>
          </div>
          <label className="w-full sm:w-80">
            <span className="sr-only">Buscar en el catálogo empresarial</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputClass} pl-10`}
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Buscar producto, variante o código…"
              />
            </span>
          </label>
        </div>

        {catalogQuery.isLoading ? <p className="p-6">Cargando catálogo…</p> : catalogRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="bg-secondary/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-black">Producto y variante</th>
                  <th className="w-36 px-3 py-3 font-black">Código POS</th>
                  <th className="w-36 px-3 py-3 font-black">Costo</th>
                  <th className="w-36 px-3 py-3 font-black">PVP</th>
                  <th className="w-28 px-3 py-3 font-black">Margen</th>
                  <th className="w-28 px-3 py-3 font-black">Estado</th>
                  {canManage && <th className="w-44 px-4 py-3 text-right font-black">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCatalogRows.map((row) => (
                  <CatalogTableRow
                    key={`${row.variant.id}-${row.variant.catalog?.updatedAt ?? "catalog"}`}
                    row={row}
                    canManage={canManage}
                    isPending={saveMutation.isPending || deleteMutation.isPending}
                    onSave={(values) => void save(row.variant, values, false)}
                    onDelete={() => void remove(row.variant)}
                  />
                ))}
              </tbody>
            </table>
            {filteredCatalogRows.length === 0 && (
              <p className="border-t border-border p-8 text-center text-sm text-muted-foreground">
                No hay productos que coincidan con la búsqueda.
              </p>
            )}
          </div>
        ) : (
          <div className="p-10 text-center">
            <PackagePlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-bold">Este grupo todavía no tiene productos.</p>
            {canManage && <p className="text-sm text-muted-foreground">Utiliza la búsqueda para agregar su primera variante.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function CatalogTableRow({ row, canManage, isPending, onSave, onDelete }: {
  row: CatalogRow;
  canManage: boolean;
  isPending: boolean;
  onSave: (values: CatalogValues) => void;
  onDelete: () => void;
}) {
  const { productName, productType, categoryName, variant } = row;
  const isSaleable = saleableTypes.has(productType);
  const originalCode = normalizePosCode(variant.catalog?.posCode ?? "");
  const originalCost = variant.catalog?.costPrice ?? variant.productCost ?? 0;
  const originalSale = isSaleable ? variant.catalog?.salePrice ?? null : null;
  const originalStatus = isSaleable ? variant.catalog?.isPosActive ?? true : false;
  const [posCode, setPosCode] = useState(originalCode);
  const [costPrice, setCostPrice] = useState(String(originalCost));
  const [salePrice, setSalePrice] = useState(originalSale === null ? "" : String(originalSale));
  const [isPosActive, setIsPosActive] = useState(originalStatus);
  const normalizedCode = normalizePosCode(posCode);
  const cost = Number(costPrice);
  const sale = isSaleable ? Number(salePrice) : null;
  const validCode = isValidPosCode(posCode);
  const validCost = costPrice.trim() !== "" && Number.isFinite(cost) && cost >= 0;
  const validSale = !isSaleable || (salePrice.trim() !== "" && sale !== null && Number.isFinite(sale) && sale >= 0);
  const hasMissingComponents = (variant.missingRecipeComponents?.length ?? 0) > 0;
  const isValid = validCode && validCost && validSale && !hasMissingComponents;
  const isDirty = normalizedCode !== originalCode ||
    !validCost || cost !== originalCost ||
    (isSaleable && (!validSale || sale !== originalSale)) ||
    isPosActive !== originalStatus;
  const margin = (sale ?? 0) - cost;
  const suggestedCost = variant.calculatedRecipeCost ?? variant.productCost ?? 0;

  const reset = () => {
    setPosCode(originalCode);
    setCostPrice(String(originalCost));
    setSalePrice(originalSale === null ? "" : String(originalSale));
    setIsPosActive(originalStatus);
  };

  return (
    <tr className={`align-top transition-colors hover:bg-secondary/25 ${isDirty ? "bg-primary/[0.04]" : ""}`}>
      <td className="px-4 py-3">
        <p className="font-black text-foreground">{productName}</p>
        <p className="text-sm text-foreground/80">{variant.name}</p>
        <p className="text-xs text-muted-foreground">{categoryName}</p>
        {canManage && suggestedCost > 0 && (
          <button
            type="button"
            className="mt-1 text-left text-xs font-bold text-primary hover:underline"
            onClick={() => setCostPrice(String(suggestedCost))}
          >
            {variant.calculatedRecipeCost !== undefined && variant.calculatedRecipeCost !== null
              ? `Usar costo de receta (${numeral(variant.calculatedRecipeCost).format("$0,0")})`
              : `Usar costo base (${numeral(variant.productCost ?? 0).format("$0,0")})`}
          </button>
        )}
        {hasMissingComponents && (
          <p className="mt-1 max-w-72 text-xs font-semibold text-danger">
            Vincula primero: {variant.missingRecipeComponents?.join(", ")}
          </p>
        )}
      </td>
      <td className="px-3 py-3">
        <input
          className={`${inputClass} uppercase ${validCode ? "" : "border-danger focus:border-danger"}`}
          value={posCode}
          maxLength={20}
          disabled={!canManage || !isSaleable}
          autoComplete="off"
          placeholder={isSaleable ? "Sin código" : "No aplica"}
          aria-label={`Código POS de ${productName} ${variant.name}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setPosCode(event.target.value.toUpperCase())}
        />
        {!validCode && <p className="mt-1 text-xs font-semibold text-danger">Solo letras, números o guiones.</p>}
      </td>
      <td className="px-3 py-3">
        <input
          className={inputClass}
          type="number"
          min="0"
          step="0.01"
          value={costPrice}
          disabled={!canManage}
          aria-label={`Costo de ${productName} ${variant.name}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setCostPrice(event.target.value)}
        />
      </td>
      <td className="px-3 py-3">
        <input
          className={inputClass}
          type="number"
          min="0"
          step="0.01"
          value={salePrice}
          disabled={!canManage || !isSaleable}
          placeholder={isSaleable ? "0" : "No aplica"}
          aria-label={`PVP de ${productName} ${variant.name}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setSalePrice(event.target.value)}
        />
      </td>
      <td className="px-3 py-3">
        {isSaleable ? (
          <span className={`inline-flex h-10 items-center font-black ${isValid && margin >= 0 ? "text-success" : "text-danger"}`}>
            {validCost && validSale ? numeral(margin).format("$0,0") : "—"}
          </span>
        ) : <span className="inline-flex h-10 items-center text-sm text-muted-foreground">No aplica</span>}
      </td>
      <td className="px-3 py-3">
        {isSaleable ? (
          <button
            type="button"
            disabled={!canManage}
            className={`h-10 w-full rounded-lg border px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-70 ${
              isPosActive
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-secondary text-muted-foreground"
            }`}
            onClick={() => setIsPosActive((active) => !active)}
          >
            {isPosActive ? "Activo" : "Inactivo"}
          </button>
        ) : <span className="inline-flex h-10 items-center text-sm text-muted-foreground">Insumo</span>}
      </td>
      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-black text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35"
              disabled={isPending || !isDirty}
              title={isDirty ? "Descartar los cambios de esta fila" : "No hay cambios por descartar"}
              onClick={reset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Descartar
            </button>
            <button
              type="button"
              className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-black text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={isPending || !isDirty || !isValid}
              title={!isDirty ? "No hay cambios por guardar" : !isValid ? "Corrige los campos antes de guardar" : "Guardar cambios"}
              onClick={() => onSave({
                posCode: normalizedCode || null,
                salePrice: sale,
                costPrice: cost,
                isPosActive: isSaleable ? isPosActive : false,
              })}
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </button>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-35"
              disabled={isPending}
              onClick={onDelete}
              aria-label={`Eliminar ${variant.name} del grupo`}
              title="Eliminar del grupo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

function CatalogCandidateRow({ productName, productType, variant, isPending, onSave }: {
  productName: string;
  productType: string;
  variant: GroupCatalogVariant;
  isPending: boolean;
  onSave: (values: CatalogValues) => void;
}) {
  const isSaleable = saleableTypes.has(productType);
  const [posCode, setPosCode] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState(String(variant.productCost ?? 0));
  const normalizedCode = normalizePosCode(posCode);
  const sale = isSaleable ? Number(salePrice) : null;
  const cost = Number(costPrice);
  const isValid = isValidPosCode(posCode) &&
    costPrice.trim() !== "" && Number.isFinite(cost) && cost >= 0 &&
    (!isSaleable || (salePrice.trim() !== "" && sale !== null && Number.isFinite(sale) && sale >= 0)) &&
    (variant.missingRecipeComponents?.length ?? 0) === 0;
  const suggestedCost = variant.calculatedRecipeCost ?? variant.productCost ?? 0;

  return (
    <div className="grid items-end gap-3 rounded-xl border border-border bg-background p-3 xl:grid-cols-[minmax(190px,1fr)_140px_140px_140px_auto]">
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{productName}</p>
        <p className="truncate text-sm font-black">{variant.name}</p>
        {suggestedCost > 0 && (
          <button
            type="button"
            className="mt-1 text-xs font-bold text-primary hover:underline"
            onClick={() => setCostPrice(String(suggestedCost))}
          >
            Usar costo sugerido ({numeral(suggestedCost).format("$0,0")})
          </button>
        )}
        {(variant.missingRecipeComponents?.length ?? 0) > 0 && (
          <p className="mt-1 text-xs text-danger">Vincula primero: {variant.missingRecipeComponents?.join(", ")}</p>
        )}
      </div>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold">Código POS</span>
        <input
          className={`${inputClass} uppercase`}
          value={posCode}
          maxLength={20}
          disabled={!isSaleable}
          placeholder={isSaleable ? "Opcional" : "No aplica"}
          onChange={(event) => setPosCode(event.target.value.toUpperCase())}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold">Costo del grupo</span>
        <input className={inputClass} type="number" min="0" step="0.01" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold">PVP</span>
        <input
          className={inputClass}
          type="number"
          min="0"
          step="0.01"
          value={salePrice}
          disabled={!isSaleable}
          placeholder={isSaleable ? "0" : "No aplica"}
          onChange={(event) => setSalePrice(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-40"
        disabled={isPending || !isValid}
        onClick={() => onSave({
          posCode: normalizedCode || null,
          salePrice: sale,
          costPrice: cost,
          isPosActive: isSaleable,
        })}
      >
        <CircleDollarSign className="h-4 w-4" />
        Agregar
      </button>
    </div>
  );
}
