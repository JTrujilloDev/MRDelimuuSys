import {
  Button,
  Chip,
  Input,
  ListBox,
  Select,
  Table,
  Tabs,
} from "@heroui/react";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
import { useGetAllProductCategories } from "../../categories/hooks/useGetAllCategories";
import { useGetAllActiveProducts } from "../../products/hooks/useGetAllActiveProducts";
import { getReportPDF } from "../services/report.service";
import { productUnits } from "../../../shared/constants/productUnits";
import TransactionForm from "../components/TransactionForm";
import InventoryMovements from "../components/InventoryMovements";
const Inventory = () => {
  const { data: categories } = useGetAllProductCategories();
  const { data: { data: activeProducts = [] } = ({} = {}) } =
    useGetAllActiveProducts();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
      <Tabs className="w-full">
        <Tabs.ListContainer className="w-sm rounded-md bg-card border border-border">
          <Tabs.List
            aria-label="Options"
            className="grid grid-cols-2 gap-1 rounded-md overflow-hidden bg-background"
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
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="pt-4 w-full" id="movements">
          <InventoryMovements onCreate={() => setDialogOpen(true)} />
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
                    {categories?.data?.map((c : any) => (
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
                  .filter((p : any) => p.productType !== "RECIPE_PRODUCT")
                  .reduce((sum : any, product : any ) => sum + product.variants.length, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Stock bajo</p>
              <p className="text-2xl font-bold text-amber-600">
                {activeProducts.reduce((sum : any, product : any   ) => {
                  const lowStockVariants = product.variants.filter(
                    (variant :any) =>
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
                {activeProducts.reduce((sum : any, product : any) => {
                  const outOfStockVariants = product.variants.filter(
                    (variant :any) =>
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
                      Unidad
                    </Table.Column>
                    <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                      Estado
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {activeProducts
                      .filter((product : any ) => {
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
                          const matchesVariant = product.variants.some((v : any) =>
                            v.name.toLowerCase().includes(searchTerm),
                          );
                          return matchesProduct || matchesVariant;
                        }
                        return true;
                      })
                      .filter(
                        (product : any) => product.productType !== "RECIPE_PRODUCT",
                      )
                      .flatMap((product : any) => {
                        const matchesProduct = product.name
                          .toLowerCase()
                          .includes(searchTerm);
                        return product.variants
                          .filter((variant : any) => {
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
                          .map((variant : any) => (
                            <Table.Row key={variant.id}>
                              <Table.Cell>{product.category.name}</Table.Cell>
                              <Table.Cell>{product.name}</Table.Cell>
                              <Table.Cell>{variant.name}</Table.Cell>
                              <Table.Cell>{variant.stock}</Table.Cell>
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
      </Tabs>

      {/* Dialog */}

      <TransactionForm
        dialogOpen={dialogOpen}
        activeProducts={activeProducts}
        setDialogOpen={setDialogOpen}
      />
    </div>
  );
};

export default Inventory;
