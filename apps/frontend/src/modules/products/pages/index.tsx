import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Cuboid,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { Button, Chip, Input, Tooltip } from "@heroui/react";
import numeral from "numeral";
import { useGetAllProductCategories } from "../../categories/hooks/useGetAllCategories";
import { productTypes } from "../../../shared/constants/productTypes";
import { useGetAllProducts } from "../hooks/useGetAllProducts";
import {
  ProductFormModal,
  type ProductRecord,
  type ProductVariantRecord,
} from "../components/ProductFormModal";

interface ProductsProps {
  embedded?: boolean;
}

const Products = ({ embedded = false }: ProductsProps) => {
  const { data: productsResponse } = useGetAllProducts();
  const { data: categoriesResponse } = useGetAllProductCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(
    null,
  );
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const products = useMemo(
    () => (productsResponse?.data ?? []) as ProductRecord[],
    [productsResponse],
  );
  const categories = categoriesResponse?.data ?? [];

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("es");
    if (!query) return products;

    return products.filter((product) => {
      const searchableText = [
        product.name,
        product.category?.name ?? "Sin categoría",
        product.description ?? "",
        ...product.variants.map((variant) => variant.name),
      ]
        .join(" ")
        .toLocaleLowerCase("es");

      return searchableText.includes(query);
    });
  }, [products, searchQuery]);

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEditForm = (product: ProductRecord) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingProduct(null);
  };

  return (
    <div
      className={`mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-6 ${
        embedded ? "" : "p-6"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Productos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra presentaciones, precios, inventario y recetas.
          </p>
        </div>
        <Button onClick={openCreateForm} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar producto, categoría o variante…"
          className="w-full pl-10"
          aria-label="Buscar productos"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-3 pb-2">
          {filteredProducts.map((product) => {
            const isExpanded = expandedProductId === product.id;
            const typeConfig = productTypes.find(
              (type) => type.value === product.productType,
            ) ?? {
              color: "bg-gray-100 text-gray-800",
              icon: Cuboid,
              label: "Tipo desconocido",
            };

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() =>
                      setExpandedProductId(isExpanded ? null : product.id)
                    }
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}

                    <Tooltip delay={0}>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${typeConfig.color}`}
                      >
                        <typeConfig.icon className="h-4 w-4" />
                      </span>
                      <Tooltip.Content>{typeConfig.label}</Tooltip.Content>
                    </Tooltip>

                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">
                        {product.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {product.category?.name ?? "Sin categoría"} ·{" "}
                        {product.variants.length}{" "}
                        {product.variants.length === 1 ? "variante" : "variantes"}
                      </span>
                    </span>
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${product.name}`}
                    onClick={() => openEditForm(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
                    {product.description && (
                      <p className="mb-3 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    {product.variants.map((variant) => (
                      <VariantSummary key={variant.id} variant={variant} />
                    ))}
                  </div>
                )}
              </article>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <Cuboid className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">
                {searchQuery.trim()
                  ? "No encontramos productos"
                  : "Todavía no hay productos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "Prueba con otro nombre, categoría o variante."
                  : "Crea el primero para comenzar a configurar el catálogo."}
              </p>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <ProductFormModal
          isOpen
          product={editingProduct}
          products={products}
          categories={categories}
          onClose={closeForm}
        />
      )}
    </div>
  );
};

function VariantSummary({ variant }: { variant: ProductVariantRecord }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{variant.name}</span>
        {!variant.isActive && (
          <Chip size="sm" className="bg-danger/15 text-danger">
            Inactiva
          </Chip>
        )}
        {variant.requirePreparation && (
          <Chip size="sm" className="bg-success/15 text-success">
            Requiere comanda
          </Chip>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Público: {numeral(variant.retailPrice).format("$0,0")}</span>
        <span>
          Mayorista: {numeral(variant.wholesalePrice).format("$0,0")}
        </span>
        <span>Costo: {numeral(variant.productCost).format("$0,0")}</span>
      </div>
    </div>
  );
}

export default Products;
