import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  toast,
} from "@heroui/react";
import axios from "axios";
import { CircleAlert, PackageOpen, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  inventoryTransactionsByProductType,
  transactionTypes,
} from "../../../shared/constants/inventoryTransactionsByProductType";
import { productUnits } from "../../../shared/constants/productUnits";
import { useCreateBulkPOSInventoryTransaction } from "../hooks/useCreateBulkPOSInventoryTransaction";

interface InventoryVariant {
  id: number;
  name: string;
  stock: number;
  unit: string;
  isNew: boolean;
}

interface InventoryProduct {
  id: number;
  name: string;
  productType: string;
  category?: { name: string };
  variants: InventoryVariant[];
}

interface CartItem extends InventoryVariant {
  productName: string;
  categoryName: string;
  quantity: string;
}

interface TransactionFormProps {
  dialogOpen: boolean;
  activeProducts: InventoryProduct[];
  setDialogOpen: (open: boolean) => void;
}

const manualTransactionTypes = Object.values(transactionTypes).filter(
  (transaction) => transaction.value !== "SALE",
);
const outputTypes = new Set(["WASTE", "WHOLESALE", "INTERNAL_CONSUMPTION"]);
const observationRequiredTypes = new Set([
  "WASTE",
  "ADJUSTMENT",
  "INTERNAL_CONSUMPTION",
]);

const getResultingStock = (item: CartItem, type: string) => {
  const quantity = Number(item.quantity) || 0;
  if (type === "ADJUSTMENT") return item.stock + quantity;
  if (outputTypes.has(type)) return item.stock - Math.abs(quantity);
  return item.stock + Math.abs(quantity);
};

const getQuantityLabel = (type: string) => {
  switch (type) {
    case "PRODUCTION":
      return "Unidades producidas";
    case "PURCHASE":
      return "Unidades recibidas";
    case "WASTE":
      return "Unidades de merma";
    default:
      return "Unidades";
  }
};

const TransactionForm = ({
  dialogOpen,
  activeProducts,
  setDialogOpen,
}: TransactionFormProps) => {
  const [transactionType, setTransactionType] = useState("PRODUCTION");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [observation, setObservation] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const { mutate: createTransactions, isPending } =
    useCreateBulkPOSInventoryTransaction();

  const eligibleVariants = useMemo(() => {
    return activeProducts.flatMap((product) => {
      const allowedTransactions =
        inventoryTransactionsByProductType[
          product.productType as keyof typeof inventoryTransactionsByProductType
        ] ?? [];

      return product.variants
        .filter((variant) => {
          if (product.productType === "RECIPE_PRODUCT") return false;
          if (transactionType === "INITIAL") return variant.isNew;
          if (variant.isNew) return false;
          return allowedTransactions.some(
            (transaction) => transaction.value === transactionType,
          );
        })
        .map((variant) => ({
          ...variant,
          productName: product.name,
          categoryName: product.category?.name ?? "Sin categoría",
        }));
    });
  }, [activeProducts, transactionType]);

  const searchResults = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return eligibleVariants
      .filter((variant) => !cartItems.some((item) => item.id === variant.id))
      .filter((variant) => {
        if (!normalizedSearch) return true;
        return `${variant.productName} ${variant.name} ${variant.categoryName}`
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .slice(0, 8);
  }, [cartItems, eligibleVariants, searchTerm]);

  const resetForm = () => {
    setTransactionType("PRODUCTION");
    setSearchTerm("");
    setObservation("");
    setCartItems([]);
  };

  const closeForm = () => {
    setConfirmationOpen(false);
    resetForm();
    setDialogOpen(false);
  };

  const addItem = (variant: Omit<CartItem, "quantity">) => {
    setCartItems((items) => [...items, { ...variant, quantity: "" }]);
    setSearchTerm("");
    setSearchFocused(false);
  };

  const updateQuantity = (variantId: number, quantity: string) => {
    if (quantity !== "" && !/^-?\d+$/.test(quantity)) return;
    setCartItems((items) =>
      items.map((item) => (item.id === variantId ? { ...item, quantity } : item)),
    );
  };

  const hasInvalidItems = cartItems.some((item) => {
    const quantity = Number(item.quantity);
    const invalidQuantity =
      !Number.isInteger(quantity) ||
      quantity === 0 ||
      (transactionType !== "ADJUSTMENT" && quantity < 0);
    return invalidQuantity || getResultingStock(item, transactionType) < 0;
  });
  const requiresObservation = observationRequiredTypes.has(transactionType);
  const canSubmit =
    cartItems.length > 0 &&
    !hasInvalidItems &&
    (!requiresObservation || observation.trim().length > 0);

  const submitTransactions = () => {
    if (!canSubmit) return;
    createTransactions(
      {
        type: transactionType,
        observation: observation.trim() || undefined,
        items: cartItems.map((item) => ({
          productVariantId: item.id,
          quantity: Number(item.quantity),
        })),
      },
      {
        onSuccess: () => {
          setConfirmationOpen(false);
          toast(
            `${cartItems.length} ${cartItems.length === 1 ? "movimiento registrado" : "movimientos registrados"} exitosamente`,
            { variant: "success" },
          );
          closeForm();
        },
        onError: (error) => {
          setConfirmationOpen(false);
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
          toast(message || "No fue posible registrar los movimientos", {
            variant: "danger",
          });
        },
      },
    );
  };

  const selectedTransaction = manualTransactionTypes.find(
    (transaction) => transaction.value === transactionType,
  );
  const totalUnits = cartItems.reduce(
    (total, item) => total + Math.abs(Number(item.quantity) || 0),
    0,
  );

  return (
    <>
      <Modal>
        <Modal.Backdrop isOpen={dialogOpen}>
          <Modal.Container size="full">
          <Modal.Dialog className="flex h-full max-h-[calc(100vh-2rem)] flex-col rounded-xl bg-pos-surface text-foreground">
            <Modal.Header className="shrink-0 border-b border-border bg-pos-surface text-foreground">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Registrar movimientos</h2>
                <p className="text-sm text-foreground/70 mt-2">
                  Agrega varias variantes y regístralas en una sola operación.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-pos-surface p-2 text-foreground">
              <div className="grid shrink-0 grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(13rem,0.8fr)_minmax(0,2fr)]">
                <div className="flex flex-col justify-end rounded-xl border border-border bg-pos-surface-soft p-3">
                  <Select
                    value={transactionType}
                    onChange={(value) => {
                      setTransactionType(String(value));
                      setCartItems([]);
                      setSearchTerm("");
                      setObservation("");
                    }}
                  >
                    <Label className="text-sm font-semibold text-foreground">
                      Tipo de movimiento
                    </Label>
                    <Select.Trigger className="border border-border bg-background text-foreground">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="rounded-md border border-border bg-pos-surface text-foreground shadow-lg">
                      <ListBox>
                        {manualTransactionTypes.map((transaction) => (
                          <ListBox.Item
                            id={transaction.value}
                            key={transaction.value}
                            textValue={transaction.label}
                          >
                            <Chip className={transaction.className}>
                              {transaction.label}
                            </Chip>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-border bg-pos-surface-soft p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Buscar producto o variante
                  </Label>
                  <span className="shrink-0 text-xs font-medium text-foreground/60">
                    {eligibleVariants.length} disponibles para {selectedTransaction?.label.toLowerCase()}
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/65" />
                  <Input
                    aria-label="Buscar producto o variante"
                    className="h-11 w-full border border-border bg-background pl-9 pr-10 text-foreground shadow-sm placeholder:text-foreground/55"
                    placeholder="Escribe para buscar..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {searchFocused && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-pos-surface p-1 text-foreground shadow-lg">
                      {searchResults.length > 0 ? (
                        searchResults.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-foreground transition-colors hover:bg-pos-surface-soft"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => addItem(variant)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-foreground">
                                {variant.productName} — {variant.name}
                              </span>
                              <span className="block truncate text-xs text-foreground/70">
                                {variant.categoryName}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-foreground/80">
                              Stock: {variant.stock}
                              <Plus className="h-4 w-4 text-primary" />
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-6 text-center text-sm text-foreground/70">
                          No hay variantes disponibles para este movimiento.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-pos-surface text-foreground">
                {cartItems.length === 0 ? (
                  <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 bg-pos-surface-soft px-4 py-10 text-center text-foreground/70">
                    <PackageOpen className="h-8 w-8 opacity-50" />
                    <p className="text-sm">Busca un producto y agrégalo al registro.</p>
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-pos-order-bg text-left text-pos-order-fg shadow-sm">
                        <tr>
                          <th className="px-3 py-3">Producto</th>
                          <th className="min-w-36 px-3 py-3">{getQuantityLabel(transactionType)}</th>
                          <th className="px-3 py-3 text-center">Inventario</th>
                          <th className="w-12 px-3 py-3" aria-label="Acciones" />
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item) => {
                          const resultingStock = getResultingStock(item, transactionType);
                          return (
                            <tr key={item.id} className="border-t border-border bg-pos-surface text-foreground even:bg-pos-surface-soft">
                              <td className="px-3 py-3">
                                <span className="block font-semibold text-foreground">{item.productName}</span>
                                <span className="block text-xs text-foreground/70">
                                  {item.name}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <Input
                                  aria-label={`${getQuantityLabel(transactionType)} de ${item.productName} ${item.name}`}
                                  className="border border-border bg-background text-foreground"
                                  type="number"
                                  inputMode="numeric"
                                  step={1}
                                  min={
                                    transactionType === "ADJUSTMENT"
                                      ? -item.stock
                                      : 1
                                  }
                                  max={
                                    outputTypes.has(transactionType)
                                      ? item.stock
                                      : undefined
                                  }
                                  value={item.quantity}
                                  onChange={(event) => updateQuantity(item.id, event.target.value)}
                                />
                                <span className="mt-1 block text-xs font-medium text-foreground/70">
                                  Unidad: {productUnits.find((unit) => unit.value === item.unit)?.label ?? item.unit}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-foreground">
                                <span className="font-semibold">{item.stock}</span>
                                <span className="mx-1.5 text-foreground/45">→</span>
                                <span
                                  className={`font-semibold ${
                                    resultingStock < 0
                                      ? "text-destructive"
                                      : "text-foreground"
                                  }`}
                                >
                                  {resultingStock}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-foreground/60">
                                  actual → resultante
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <Button
                                  isIconOnly
                                  aria-label={`Quitar ${item.productName} ${item.name}`}
                                  variant="ghost"
                                  onClick={() =>
                                    setCartItems((items) =>
                                      items.filter((cartItem) => cartItem.id !== item.id),
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-1.5 rounded-xl border border-border bg-pos-surface-soft p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Observación
                  </Label>
                  <span
                    className={`text-xs font-medium ${
                      requiresObservation
                        ? "text-destructive"
                        : "text-foreground/60"
                    }`}
                  >
                    {requiresObservation ? "Obligatoria" : "Opcional"}
                  </span>
                </div>
                <TextArea
                  aria-label="Observación general de los movimientos"
                  className="min-h-16 w-full border border-border bg-background text-foreground placeholder:text-foreground/55"
                  rows={2}
                  placeholder="Agrega una observación general para estos movimientos"
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                />
                {requiresObservation && !observation.trim() && (
                  <p className="text-xs text-destructive">
                    Describe el motivo para poder registrar los movimientos.
                  </p>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-pos-surface text-foreground sm:flex-row sm:items-center sm:justify-between p-3">
              <p className="text-sm text-foreground/70">
                {cartItems.length === 0
                  ? "Sin productos agregados"
                  : `${cartItems.length} ${cartItems.length === 1 ? "producto agregado" : "productos agregados"}`}
              </p>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Button
                  className="flex-1 border-border bg-background text-foreground sm:min-w-28 sm:flex-none"
                  variant="outline"
                  onClick={closeForm}
                  isDisabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground sm:min-w-44 sm:flex-none"
                  onClick={() => setConfirmationOpen(true)}
                  isDisabled={!canSubmit || isPending}
                >
                  {`Registrar ${cartItems.length || ""} ${cartItems.length === 1 ? "movimiento" : "movimientos"}`}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop isOpen={confirmationOpen}>
          <Modal.Container size="sm">
            <Modal.Dialog className="rounded-xl bg-pos-surface text-foreground">
              <Modal.Header className="border-b border-border bg-pos-surface text-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <CircleAlert className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Confirmar movimientos
                    </h2>
                    <p className="text-sm text-foreground/70">
                      Revisa el resumen antes de continuar.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="flex flex-col gap-4 bg-pos-surface p-5 text-foreground">
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-pos-surface-soft p-4 text-center">
                  <div>
                    <span className="block text-xs text-foreground/60">Movimiento</span>
                    <span className="mt-1 block font-semibold text-foreground">
                      {selectedTransaction?.label}
                    </span>
                  </div>
                  <div className="border-x border-border px-2">
                    <span className="block text-xs text-foreground/60">Productos</span>
                    <span className="mt-1 block font-semibold text-foreground">
                      {cartItems.length}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-foreground/60">Unidades</span>
                    <span className="mt-1 block font-semibold text-foreground">
                      {totalUnits}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-foreground/75">
                  Se actualizará el inventario de todas las variantes incluidas. La operación se registrará completa o no se aplicará ningún movimiento.
                </p>
              </Modal.Body>

              <Modal.Footer className="flex justify-end gap-2 border-t border-border bg-pos-surface p-4">
                <Button
                  className="border-border bg-background text-foreground"
                  variant="outline"
                  onClick={() => setConfirmationOpen(false)}
                  isDisabled={isPending}
                >
                  Volver
                </Button>
                <Button
                  className="min-w-40 bg-primary text-primary-foreground"
                  onClick={submitTransactions}
                  isDisabled={isPending}
                >
                  {isPending ? "Registrando..." : "Confirmar registro"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};

export default TransactionForm;
