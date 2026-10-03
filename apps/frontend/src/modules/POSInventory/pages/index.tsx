import {
  Button,
  Chip,
  Input,
  ListBox,
  Select,
  Table,
  Tabs,
  toast,
} from "@heroui/react";
import { CalendarClock, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { useGetAllProductCategories } from "../../categories/hooks/useGetAllCategories";
import { useGetInventoryProducts } from "../../products/hooks/useGetInventoryProducts";
import { getReportPDF } from "../services/report.service";
import { productUnits } from "../../../shared/constants/productUnits";
import TransactionForm from "../components/TransactionForm";
import InventoryMovements from "../components/InventoryMovements";
import { useAuth } from "../../../app/auth/AuthProvider";
import { updateStoreInventorySettings } from "../services/POSInventory.service";
import { getDaysUntilExpiration, needsExpirationWarning } from "../../../shared/utils/expiration.rules";

interface InventoryVariant {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  isNew: boolean;
  lots: InventoryLot[];
}

interface InventoryLot {
  id: number;
  code: string;
  manufacturedAt: string | null;
  expiresAt: string | null;
  isLegacy: boolean;
  stock: number;
}

interface InventoryProduct {
  id: number;
  name: string;
  productType: string;
  category: { id: number; name: string };
  variants: InventoryVariant[];
}

interface InventoryCategory {
  id: number;
  name: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatLotDate = (value: string | null) =>
  value ? dateFormatter.format(new Date(value)) : "Sin fecha";

const getExpirationStatus = (expiresAt: string | null) => {
  const days = getDaysUntilExpiration(expiresAt);
  if (days === null) return { label: "Sin vencimiento", className: "bg-muted text-foreground/75" };
  if (days < 0) return { label: `Vencido hace ${Math.abs(days)} d`, className: "bg-danger-soft-hover text-destructive" };
  if (days === 0) return { label: "Vence hoy", className: "bg-danger-soft-hover text-destructive" };
  if (needsExpirationWarning(days)) return { label: "Vence mañana", className: "bg-orange-500/20 text-orange-700" };
  return { label: "Vigente", className: "bg-[#10b981]/20 text-[#047857]" };
};

const Inventory = () => {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const selectedTab = requestedTab === "current-stock" || requestedTab === "lots"
    ? requestedTab
    : "movements";
  const { data: categories } = useGetAllProductCategories();
  const productsQuery = useGetInventoryProducts();
  const activeProducts = (productsQuery.data?.data ?? []) as InventoryProduct[];
  const inventoryCategories = (categories?.data ?? []) as InventoryCategory[];
  const [dialogOpen, setDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const lotRows = useMemo(
    () => activeProducts
      .filter((product) => product.productType !== "RECIPE_PRODUCT")
      .flatMap((product) => product.variants.flatMap((variant) =>
        (variant.lots ?? []).map((lot) => ({ product, variant, lot })),
      ))
      .sort((left, right) => {
        const leftExpiry = left.lot.expiresAt ?? "9999-12-31";
        const rightExpiry = right.lot.expiresAt ?? "9999-12-31";
        return leftExpiry.localeCompare(rightExpiry) || left.product.name.localeCompare(right.product.name);
      }),
    [activeProducts],
  );
  const expiredLots = lotRows.filter(({ lot }) => {
    const days = getDaysUntilExpiration(lot.expiresAt);
    return lot.stock > 0 && days !== null && days < 0;
  }).length;
  const expiringSoonLots = lotRows.filter(({ lot }) => {
    const days = getDaysUntilExpiration(lot.expiresAt);
    return lot.stock > 0 && days !== null && days >= 0 && needsExpirationWarning(days);
  }).length;
  const historicalLots = lotRows.filter(({ lot }) => lot.isLegacy).length;
  const canManageInventory = Boolean(
    state?.user.isGlobalAdmin || state?.activeContext?.role === "ADMIN",
  );
  const settingsMutation = useMutation({
    mutationFn: ({ variantId, minStock }: { variantId: number; minStock: number }) =>
      updateStoreInventorySettings(variantId, minStock),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["getInventoryProducts"] });
      toast("Stock mínimo actualizado", { variant: "success" });
    },
    onError: () => toast("No fue posible actualizar el stock mínimo", { variant: "danger" }),
  });

  const updateMinimumStock = (event: FormEvent<HTMLFormElement>, variantId: number) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minStock = Number(form.get("minStock"));
    if (!Number.isInteger(minStock) || minStock < 0) return;
    settingsMutation.mutate({ variantId, minStock });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
        <p className="text-sm text-muted-foreground">Punto: {state?.activeContext?.store.name}</p>
      </div>
      <Tabs
        className="w-full"
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSearchParams({ tab: String(key) })}
      >
        <Tabs.ListContainer className="w-full max-w-2xl rounded-md bg-card border border-border">
          <Tabs.List
            aria-label="Options"
            className="grid grid-cols-3 gap-1 rounded-md overflow-hidden bg-background"
          >
            <Tabs.Tab
              id="movements"
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground"
            >
              Movimientos
              <Tabs.Indicator className="bg-primary" />
            </Tabs.Tab>
            <Tabs.Tab
              id="current-stock"
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground"
            >
              Estado de Inventario
              <Tabs.Indicator className="bg-primary" />
            </Tabs.Tab>
            <Tabs.Tab
              id="lots"
              className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground"
            >
              Lotes y vencimientos
              <Tabs.Indicator className="bg-primary" />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="pt-4 w-full" id="movements">
          <InventoryMovements canCreate={canManageInventory} onCreate={() => setDialogOpen(true)} />
        </Tabs.Panel>
        <Tabs.Panel className="pt-4 flex flex-col gap-4" id="current-stock">
          <div className="flex items-center justify-between gap-3 flex-wrap w-full ">
            <div className="flex items-center gap-4 w-2/3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-full"
                  placeholder="Buscar producto o variante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                />
              </div>
              <Select
                onChange={(value) => setFilterCategory(String(value) || "")}
                value={filterCategory}
                defaultValue=""
                placeholder="Seleccione una categoría"
                className="w-1/3"
                aria-label="Filtrar por categoría"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="rounded-md">
                  <ListBox>
                    <ListBox.Item
                      id={"all"}
                      textValue="Todas las categorías"
                      key="all"
                    >
                      Todas las categorías
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {inventoryCategories.map((c) => (
                      <ListBox.Item
                        id={c.id.toString()}
                        textValue={c.name}
                        key={c.id}
                        aria-label={c.name}
                      >
                        {c.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                const pdfUrl = await getReportPDF();

                window.open(pdfUrl, "_blank");
              }}
              className="rounded-md"
            >
              <FileText className="h-4 w-4 mr-1" /> Generar reporte de
              verificación
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Variantes</p>
              <p className="text-2xl font-bold text-foreground">
                {activeProducts
                  .filter((product) => product.productType !== "RECIPE_PRODUCT")
                  .reduce((sum, product) => sum + product.variants.length, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Stock bajo</p>
              <p className="text-2xl font-bold text-amber-600">
                {activeProducts.reduce((sum, product) => {
                  const lowStockVariants = product.variants.filter(
                    (variant) =>
                      variant.stock > 0 &&
                      variant.stock <= variant.minStock &&
                      product.productType !== "RECIPE_PRODUCT",
                  );
                  return sum + lowStockVariants.length;
                }, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Sin stock</p>
              <p className="text-2xl font-bold text-destructive">
                {activeProducts.reduce((sum, product) => {
                  const outOfStockVariants = product.variants.filter(
                    (variant) =>
                      variant.stock === 0 &&
                      product.productType !== "RECIPE_PRODUCT",
                  );
                  return sum + outOfStockVariants.length;
                }, 0)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table className="w-full overflow-hidden rounded-[24px] border border-border bg-pos-surface shadow-sm">
              <Table.ScrollContainer className="max-h-[55vh] overflow-y-auto overflow-x-auto">
                <Table.Content aria-label="Table">
                  <Table.Header>
                    <Table.Column
                      className="bg-pos-order-bg text-white text font-extrabold"
                      isRowHeader
                    >
                      Categoría
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Producto
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Variante
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Stock actual
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Stock mínimo
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Unidad
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Estado
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {activeProducts
                      .filter((product) => {
                        // Filtro por categoría
                        if (filterCategory && filterCategory !== "all") {
                          const categoryId = parseInt(filterCategory);
                          if (product.category.id !== categoryId) return false;
                        }
                        // Filtro por búsqueda en producto o variante
                        if (searchTerm) {
                          const matchesProduct = product.name
                            .toLowerCase()
                            .includes(searchTerm);
                          const matchesVariant = product.variants.some((variant) =>
                            variant.name.toLowerCase().includes(searchTerm),
                          );
                          return matchesProduct || matchesVariant;
                        }
                        return true;
                      })
                      .filter(
                        (product) => product.productType !== "RECIPE_PRODUCT",
                      )
                      .flatMap((product) => {
                        const matchesProduct = product.name
                          .toLowerCase()
                          .includes(searchTerm);
                        return product.variants
                          .filter((variant) => {
                            if (searchTerm) {
                              // Si el producto coincide, mostrar todas sus variantes
                              if (matchesProduct) return true;
                              // Si no, solo mostrar variantes que coincidan
                              return variant.name
                                .toLowerCase()
                                .includes(searchTerm);
                            }
                            return true;
                          })
                          .map((variant) => (
                            <Table.Row key={variant.id}>
                              <Table.Cell>{product.category.name}</Table.Cell>
                              <Table.Cell>{product.name}</Table.Cell>
                              <Table.Cell>{variant.name}</Table.Cell>
                              <Table.Cell>{variant.stock}</Table.Cell>
                              <Table.Cell>
                                {canManageInventory ? (
                                  <form className="flex min-w-32 items-center gap-2" onSubmit={(event) => updateMinimumStock(event, variant.id)}>
                                    <Input
                                      className="w-20"
                                      name="minStock"
                                      type="number"
                                      min="0"
                                      step="1"
                                      defaultValue={String(variant.minStock)}
                                      aria-label={`Stock mínimo de ${product.name} ${variant.name}`}
                                    />
                                    <Button type="submit" size="sm" isDisabled={settingsMutation.isPending}>Guardar</Button>
                                  </form>
                                ) : variant.minStock}
                              </Table.Cell>
                              <Table.Cell>
                                {
                                  productUnits.find(
                                    (u) => u.value === variant.unit,
                                  )?.label
                                }
                              </Table.Cell>

                              <Table.Cell>
                                {variant.stock > variant.minStock ? (
                                  <Chip className="bg-[#10b981]/20 text-[#10b981]">
                                    En stock
                                  </Chip>
                                ) : variant.stock === 0 ? (
                                  <Chip className=" bg-danger-soft-hover text-destructive">
                                    Sin stock
                                  </Chip>
                                ) : (
                                  <Chip className=" bg-amber-600/20 text-amber-600">
                                    Stock bajo
                                  </Chip>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          ));
                      })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
              <Table.Footer>{/* Optional footer content */}</Table.Footer>
            </Table>
          </div>
        </Tabs.Panel>
        <Tabs.Panel className="pt-4 flex flex-col gap-4" id="lots">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Lotes vencidos con existencias</p>
              <p className="mt-1 text-2xl font-bold text-destructive">{expiredLots}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Vencen hoy o mañana con existencias</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{expiringSoonLots}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Lotes históricos sin fecha</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{historicalLots}</p>
            </div>
          </div>

          {lotRows.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">No hay lotes con existencias</p>
                <p className="text-sm text-muted-foreground">
                  Los lotes aparecerán al registrar una recepción desde planta.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table className="w-full overflow-hidden bg-pos-surface shadow-sm">
                <Table.ScrollContainer className="max-h-[62vh] overflow-auto">
                  <Table.Content aria-label="Lotes y fechas de vencimiento">
                    <Table.Header>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white" isRowHeader>Producto</Table.Column>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white">Variante</Table.Column>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white">Lote</Table.Column>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white">Existencias</Table.Column>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white">Fabricación</Table.Column>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white">Vencimiento</Table.Column>
                      <Table.Column className="bg-pos-order-bg font-extrabold text-white">Estado</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {lotRows.map(({ product, variant, lot }) => {
                        const status = getExpirationStatus(lot.expiresAt);
                        return (
                          <Table.Row key={`${variant.id}-${lot.id}`}>
                            <Table.Cell>{product.name}</Table.Cell>
                            <Table.Cell>{variant.name}</Table.Cell>
                            <Table.Cell>
                              <span className="font-mono text-sm font-semibold">{lot.code}</span>
                              {lot.isLegacy && (
                                <span className="mt-1 block text-xs text-muted-foreground">Inventario anterior</span>
                              )}
                            </Table.Cell>
                            <Table.Cell>{lot.stock}</Table.Cell>
                            <Table.Cell>{formatLotDate(lot.manufacturedAt)}</Table.Cell>
                            <Table.Cell>{formatLotDate(lot.expiresAt)}</Table.Cell>
                            <Table.Cell><Chip className={status.className}>{status.label}</Chip></Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Dialog */}

      {canManageInventory && (
        <TransactionForm
          dialogOpen={dialogOpen}
          activeProducts={activeProducts}
          setDialogOpen={setDialogOpen}
        />
      )}
    </div>
  );
};

export default Inventory;
