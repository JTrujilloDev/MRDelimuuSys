import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Table,
  Tabs,
  TextArea,
  toast,
} from "@heroui/react";
import { FileText, Filter, PackagePlus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useGetPOSInventoryTransactions } from "../hooks/useGetPOSInventoryTransactions";
import dayjs from "dayjs";
import { useGetAllProductCategories } from "../../categories/hooks/useGetAllCategories";
import { useGetProductsByCategory } from "../../products/hooks/useGetProductsByCategory";
import { useCreatePOSInventoryTransaction } from "../hooks/useCreatePOSInventoryTransaction";
import { useGetAllActiveProducts } from "../../products/hooks/useGetAllActiveProducts";
import { getReportPDF } from "../services/report.service";
const transactionTypes = [
  {
    value: "PURCHASE",
    label: "Compra",
    className: "bg-[#3b82f6]/20 text-[#3b82f6]",
  },
  {
    value: "ADJUSTMENT",
    label: "Ajuste",
    className: "bg-[#facc15]/20 text-[#ca8a04]",
  },
  {
    value: "RETURN",
    label: "Devolución",
    className: "bg-[#8E51FF]/20 text-[#8E51FF]",
  },
  {
    value: "WASTE",
    label: "Merma",
    className: "bg-[#ef4444]/20 text-[#ef4444]",
  },
  {
    value: "PRODUCTION",
    label: "Producción",
    className: "bg-[#06b6d4]/20 text-[#0891b2]",
  },
  {
    value: "INITIAL",
    label: "Inventario inicial",
    className: "bg-[#FF7B1E]/20 text-[#FF7B1E]",
  },
  {
    value: "WHOLESALE",
    label: "Venta al por mayor",
    className: "bg-[#10b981]/20 text-[#10b981]",
  },
  {
    value: "SALE",
    label: "Venta POS",
    className: "bg-[#10b981]/20 text-[#10b981]",
  },
  {
    value: "INTERNAL_CONSUMPTION",
    label: "Consumo interno",
    className: "bg-[#ef4410]/20 text-[#ef4410]",
  }
];

const getTransactionChipProps = (type: string) => {
  return (
    transactionTypes.find((item) => item.value === type) ?? {
      value: type,
      label: type,
      className: "bg-border text-foreground",
    }
  );
};

interface TransactionFormData {
  productVariantId: number | null;
  type: string;
  quantity: number;
  observation: string;
}
const Inventory = () => {
  const { data: { data: transactions = [] } = ({} = {}) } =
    useGetPOSInventoryTransactions();
  const { data: categories } = useGetAllProductCategories();
  const { data: { data: activeProducts = [] } = ({} = {}) } =
    useGetAllActiveProducts();
  const { mutate: createTransaction } = useCreatePOSInventoryTransaction();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [transactionData, setTransactionData] = useState<TransactionFormData>({
    productVariantId: null,
    type: "",
    quantity: 0,
    observation: "",
  });
  const [selectedFilter, setSelectedFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  useEffect(() => {
    if (selectedCategory) {
      setAvailableVariants(
        products?.data?.find((p) => p.id === selectedProduct)?.variants || [],
      );
    }
  }, [selectedProduct]);

  const { data: products } = useGetProductsByCategory(selectedCategory);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
        <Tabs.Panel className="pt-4 w-full flex flex-col gap-4" id="movements">
          <div className="flex items-center justify-end">
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <PackagePlus className="h-4 w-4 mr-1" /> Regitrar movimiento
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Transacciones
              </p>
              <p className="text-2xl font-bold text-foreground">
                {transactions.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Producción Total
              </p>
              <p className="text-2xl font-bold text-green-600"></p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Merma Total</p>
              <p className="text-2xl font-bold text-destructive"></p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              size="sm"
              className={`rounded-md ${
                !selectedFilter
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground bg-muted"
              }`}
              onClick={() => setSelectedFilter("")}
            >
              Todas
            </Button>
            {transactionTypes.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant="outline"
                className={`rounded-md ${
                  selectedFilter === item.value
                    ? `${item.className}`
                    : "text-muted-foreground"
                }`}
                onClick={() => setSelectedFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Transaction table */}
          <Table className="w-full overflow-hidden rounded-[24px] border border-border bg-pos-surface shadow-sm">
            <Table.ScrollContainer className="max-h-[55vh] overflow-y-auto overflow-x-auto">
              <Table.Content aria-label="Example table">
                <Table.Header>
                  <Table.Column
                    className="bg-pos-order-bg text-white text font-extrabold"
                    isRowHeader
                  >
                    Tipo
                  </Table.Column>
                  <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                    Producto
                  </Table.Column>
                  <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                    Variante
                  </Table.Column>
                  <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                    Cantidad
                  </Table.Column>

                  <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                    Observaciones
                  </Table.Column>
                  <Table.Column className="bg-pos-order-bg text-white text font-extrabold">
                    Fecha
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {transactions
                    .filter(
                      (tx) => tx.type === selectedFilter || !selectedFilter,
                    )
                    .map((tx) => (
                      <Table.Row key={tx.id}>
                        <Table.Cell>
                          {(() => {
                            const chipProps = getTransactionChipProps(tx.type);
                            return (
                              <Chip
                                className={`text-xs font-medium ${chipProps.className}`}
                              >
                                {chipProps.label}
                              </Chip>
                            );
                          })()}
                        </Table.Cell>

                        <Table.Cell className="text-foreground">
                          {tx.productVariant?.product?.name}
                        </Table.Cell>

                        <Table.Cell className="text-foreground">
                          {tx.productVariant?.name}
                        </Table.Cell>

                        <Table.Cell className="text-foreground font-medium text-center">
                          {tx.quantity}
                        </Table.Cell>

                        <Table.Cell className="text-foreground max-w-[150px] truncate">
                          {tx.observation || "—"}
                        </Table.Cell>

                        <Table.Cell className="text-foreground text-xs">
                          {dayjs(tx.createdAt).format("DD/MM HH:mm")}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
            <Table.Footer>{/* Optional footer content */}</Table.Footer>
          </Table>
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
                <Select.Popover className="rounded-xl">
                  <ListBox>
                    <ListBox.Item
                      id={"all"}
                      textValue="Todas las categorías"
                      key="all"
                    >
                      Todas las categorías
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {categories?.data?.map((c) => (
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
                {activeProducts.reduce(
                  (sum, product) => sum + product.variants.length,
                  0,
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Stock bajo</p>
              <p className="text-2xl font-bold text-amber-600">
                {activeProducts.reduce((sum, product) => {
                  const lowStockVariants = product.variants.filter(
                    (variant) =>
                      variant.stock > 0 && variant.stock <= variant.minStock,
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
                    (variant) => variant.stock === 0,
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
                          const matchesVariant = product.variants.some(
                            (v) =>
                              v.name.toLowerCase().includes(searchTerm),
                          );
                          return matchesProduct || matchesVariant;
                        }
                        return true;
                      })
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

      <Modal>
        <Modal.Backdrop isOpen={dialogOpen}>
          <Modal.Container size="lg">
            <Modal.Dialog className="rounded-xl">
              <Modal.Header>
                <h2 className="text-lg font-bold">Registrar movimiento</h2>
                <p className="text-sm text-muted-foreground">
                  Formulario de registro de movimiento
                </p>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4 p-4">
                <div className="flex gap-4 flex-col mb-4">
                  <Select
                    onChange={(value) => setSelectedCategory(Number(value))}
                    value={selectedCategory?.toString() || ""}
                    defaultValue=""
                    placeholder="Seleccione una categoria"
                    aria-label="Categoria"
                  >
                    <Label className="text-sm font-medium">Categoria</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="rounded-xl">
                      <ListBox>
                        {categories?.data?.map((cat) => (
                          <ListBox.Item
                            id={cat.id.toString()}
                            textValue={cat.name}
                            key={cat.id}
                          >
                            {cat.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    onChange={(value) => {
                      setTransactionData((prev) => ({
                        ...prev,
                        productVariantId: null,
                      }));
                      setAvailableVariants([]);
                      setSelectedProduct(Number(value));
                    }}
                    value={selectedProduct?.toString() || ""}
                    defaultValue=""
                    placeholder="Seleccione un producto"
                  >
                    <Label className="text-sm font-medium ">Producto</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="rounded-xl">
                      <ListBox>
                        {products?.data?.map((prod) => (
                          <ListBox.Item
                            id={prod.id.toString()}
                            textValue={prod.name}
                            key={prod.id}
                          >
                            {prod.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    onChange={(value) =>
                      setTransactionData((prev) => ({
                        ...prev,
                        productVariantId: Number(value) || null,
                      }))
                    }
                    value={transactionData.productVariantId?.toString() || ""}
                    defaultValue=""
                    placeholder="Seleccione una variante"
                  >
                    <Label className="text-sm font-medium ">Variante</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="rounded-xl">
                      <ListBox>
                        {availableVariants.map((variant) => (
                          <ListBox.Item
                            id={variant.id.toString()}
                            textValue={variant.name}
                            key={variant.id}
                          >
                            {variant.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <Select
                  onChange={(value) =>
                    setTransactionData((prev) => ({
                      ...prev,
                      type: value?.toString() || "",
                    }))
                  }
                  value={transactionData.type || ""}
                  defaultValue=""
                  placeholder="Seleccione el tipo de transacción"
                >
                  <Label className="text-sm font-medium ">
                    Tipo de transacción
                  </Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover className="rounded-xl ">
                    <ListBox>
                      {transactionTypes
                        .filter((type) => type.value !== "SALE")
                        .map((type) => (
                          <ListBox.Item id={type.value} textValue={type.label}>
                            <Chip
                              key={type.value}
                              className={type.className}
                              size="sm"
                            >
                              {type.label}
                            </Chip>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Input
                  placeholder="Cantidad"
                  onChange={(e) =>
                    setTransactionData((prev) => ({
                      ...prev,
                      quantity: Number(e.target.value),
                    }))
                  }
                />
                <TextArea
                  placeholder="Observaciones"
                  onChange={(e) =>
                    setTransactionData((prev) => ({
                      ...prev,
                      observation: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedProduct(null);
                    setTransactionData({
                      productVariantId: null,
                      type: "",
                      quantity: 0,
                      observation: "",
                    });
                    setAvailableVariants([]);
                    setDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (
                      transactionData.productVariantId === null ||
                      !transactionData.type ||
                      transactionData.quantity === 0
                    ) {
                      toast("Por favor complete todos los campos requeridos", {
                        variant: "danger",
                      });
                      return;
                    }
                    createTransaction(transactionData, {
                      onSuccess: () => {
                        setSelectedCategory(null);
                        setSelectedProduct(null);
                        setTransactionData({
                          productVariantId: null,
                          type: "",
                          quantity: 0,
                          observation: "",
                        });
                        setAvailableVariants([]);
                        setDialogOpen(false);
                        toast("Movimiento registrado exitosamente", {
                          variant: "success",
                        });
                      },
                      onError: (error) => {
                        toast(
                          error instanceof Error
                            ? error.message
                            : "Error al registrar el movimiento",
                          {
                            variant: "danger",
                          },
                        );
                      },
                    });
                  }}
                >
                  Registrar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};

export default Inventory;
