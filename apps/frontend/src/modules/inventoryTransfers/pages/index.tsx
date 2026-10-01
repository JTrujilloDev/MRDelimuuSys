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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, PackageCheck, Plus, Search, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../../app/auth/AuthProvider";
import { useGetInventoryProducts } from "../../products/hooks/useGetInventoryProducts";
import {
  createInventoryTransfer,
  getInventoryTransferDestinations,
  getInventoryTransfers,
  receiveInventoryTransfer,
  type InventoryTransfer,
} from "../inventoryTransfers.service";

interface InventoryProduct {
  id: number;
  name: string;
  productType: string;
  variants: Array<{ id: number; name: string; stock: number; unit: string }>;
}

interface DispatchItem {
  productVariantId: number;
  productName: string;
  variantName: string;
  stock: number;
  quantity: string;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error) ? error.response?.data?.message || fallback : fallback;

const InventoryTransfersPage = () => {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const activeStoreId = state!.activeContext!.store.id;
  const productsQuery = useGetInventoryProducts();
  const products = (productsQuery.data?.data ?? []) as InventoryProduct[];
  const destinationsQuery = useQuery({
    queryKey: ["inventory-transfer-destinations", activeStoreId],
    queryFn: getInventoryTransferDestinations,
  });
  const transfersQuery = useQuery({
    queryKey: ["inventory-transfers", activeStoreId],
    queryFn: getInventoryTransfers,
  });
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receiveTransfer, setReceiveTransfer] = useState<InventoryTransfer | null>(null);
  const [destinationStoreId, setDestinationStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [dispatchObservation, setDispatchObservation] = useState("");
  const [receivedQuantities, setReceivedQuantities] = useState<Record<number, string>>({});
  const [receptionObservation, setReceptionObservation] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");

  const transfers = transfersQuery.data ?? [];
  const pendingIncoming = transfers.filter(
    (transfer) => transfer.status === "DISPATCHED" && transfer.destinationStoreId === activeStoreId,
  );
  const inTransitOutgoing = transfers.filter(
    (transfer) => transfer.status === "DISPATCHED" && transfer.originStoreId === activeStoreId,
  );
  const eligibleVariants = useMemo(
    () => products
      .filter((product) => product.productType !== "RECIPE_PRODUCT")
      .flatMap((product) => product.variants
        .filter((variant) => variant.stock > 0)
        .map((variant) => ({ ...variant, productName: product.name }))),
    [products],
  );
  const searchResults = eligibleVariants.filter((variant) =>
    !dispatchItems.some((item) => item.productVariantId === variant.id) &&
    `${variant.productName} ${variant.name}`.toLowerCase().includes(search.trim().toLowerCase()),
  ).slice(0, 8);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers", activeStoreId] }),
      queryClient.invalidateQueries({ queryKey: ["getInventoryProducts"] }),
    ]);
  };
  const dispatchMutation = useMutation({
    mutationFn: createInventoryTransfer,
    onSuccess: async () => {
      await refresh();
      toast("Traslado despachado", { variant: "success" });
      closeDispatch();
    },
    onError: (error) => toast(getErrorMessage(error, "No fue posible despachar el traslado"), { variant: "danger" }),
  });
  const receiveMutation = useMutation({
    mutationFn: ({ transferId, data }: { transferId: number; data: Parameters<typeof receiveInventoryTransfer>[1] }) =>
      receiveInventoryTransfer(transferId, data),
    onSuccess: async () => {
      await refresh();
      toast("Traslado recibido", { variant: "success" });
      closeReception();
    },
    onError: (error) => toast(getErrorMessage(error, "No fue posible recibir el traslado"), { variant: "danger" }),
  });

  const closeDispatch = () => {
    setDispatchOpen(false);
    setDestinationStoreId("");
    setSearch("");
    setDispatchItems([]);
    setDispatchObservation("");
  };
  const openReception = (transfer: InventoryTransfer) => {
    setReceiveTransfer(transfer);
    setReceivedQuantities(Object.fromEntries(transfer.items.map((item) => [item.id, String(item.quantitySent)])));
    setReceptionObservation("");
    setDiscrepancyReason("");
  };
  const closeReception = () => {
    setReceiveTransfer(null);
    setReceivedQuantities({});
    setReceptionObservation("");
    setDiscrepancyReason("");
  };
  const dispatchIsValid = Boolean(destinationStoreId) && dispatchItems.length > 0 && dispatchItems.every((item) => {
    const quantity = Number(item.quantity);
    return Number.isInteger(quantity) && quantity > 0 && quantity <= item.stock;
  });
  const receptionItems = receiveTransfer?.items.map((item) => ({
    itemId: item.id,
    quantityReceived: Number(receivedQuantities[item.id]),
  })) ?? [];
  const receptionHasInvalidQuantity = receptionItems.some(
    (item) => !Number.isInteger(item.quantityReceived) || item.quantityReceived < 0,
  );
  const hasDiscrepancy = Boolean(receiveTransfer?.items.some(
    (item) => Number(receivedQuantities[item.id]) !== item.quantitySent,
  ));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Traslados de inventario</h1>
          <p className="text-sm text-muted-foreground">Punto activo: {state!.activeContext!.store.name}</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground"
          onClick={() => setDispatchOpen(true)}
          isDisabled={(destinationsQuery.data?.length ?? 0) === 0}
        >
          <Plus className="h-4 w-4" /> Nuevo traslado
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pendientes por recibir</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingIncoming.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Despachados en tránsito</p>
          <p className="mt-1 text-2xl font-bold text-primary">{inTransitOutgoing.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Traslados visibles</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{transfers.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {transfers.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card text-center">
            <Truck className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Aún no hay traslados para este punto</p>
            <p className="text-sm text-muted-foreground">Crea el primero cuando necesites mover existencias.</p>
          </div>
        ) : transfers.map((transfer) => {
          const incoming = transfer.destinationStoreId === activeStoreId;
          const sentTotal = transfer.items.reduce((sum, item) => sum + item.quantitySent, 0);
          const receivedTotal = transfer.items.reduce((sum, item) => sum + (item.quantityReceived ?? 0), 0);
          return (
            <div key={transfer.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Traslado #{transfer.id}</span>
                    <Chip className={transfer.status === "RECEIVED" ? "bg-success/15 text-success" : "bg-amber-500/20 text-amber-700"}>
                      {transfer.status === "RECEIVED" ? "Recibido" : "En tránsito"}
                    </Chip>
                    <Chip className="bg-muted text-foreground">{incoming ? "Entrada" : "Salida"}</Chip>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{transfer.originStore.name}</span><ArrowRight className="h-4 w-4" /><span>{transfer.destinationStore.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Despachado por {transfer.dispatchedByUser.name} · {formatDateTime(transfer.dispatchedAt)}
                  </p>
                </div>
                {incoming && transfer.status === "DISPATCHED" && (
                  <Button className="bg-primary text-primary-foreground" onClick={() => openReception(transfer)}>
                    <PackageCheck className="h-4 w-4" /> Recibir
                  </Button>
                )}
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-pos-order-bg text-left text-white">
                    <tr><th className="p-2">Producto</th><th className="p-2">Lote</th><th className="p-2">Enviado</th><th className="p-2">Recibido</th></tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="p-2">{item.productVariant.product.name} · {item.productVariant.name}</td>
                        <td className="p-2 font-mono">{item.inventoryLot.code}</td>
                        <td className="p-2">{item.quantitySent}</td>
                        <td className="p-2">{item.quantityReceived ?? "Pendiente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Total enviado: {sentTotal}{transfer.status === "RECEIVED" ? ` · Total recibido: ${receivedTotal}` : ""}
                {transfer.discrepancyReason ? ` · Diferencia: ${transfer.discrepancyReason}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      <Modal>
        <Modal.Backdrop isOpen={dispatchOpen}>
          <Modal.Container size="lg">
            <Modal.Dialog className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-pos-surface text-foreground shadow-2xl">
              <Modal.Header className="shrink-0 border-b border-border bg-pos-surface px-4 py-3 text-foreground sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Nuevo traslado</h2>
                    <p className="text-xs text-foreground/65 sm:text-sm">
                      El inventario saldrá del punto al confirmar el despacho.
                    </p>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="min-h-0 space-y-3 overflow-y-auto bg-pos-surface px-4 py-3 text-foreground sm:px-5">
                <section className="rounded-xl border border-border bg-pos-surface-soft p-3">
                  <div className="mb-2">
                    <p className="text-sm font-bold text-foreground">Destino</p>
                  </div>
                  <Select
                    value={destinationStoreId || null}
                    onChange={(value) => setDestinationStoreId(String(value))}
                  >
                    <Label className="sr-only">Punto de destino</Label>
                    <Select.Trigger className="h-10 border border-border bg-background text-foreground shadow-sm">
                      <Select.Value placeholder="Selecciona el punto de destino" />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="border border-border bg-pos-surface text-foreground">
                      <ListBox>
                        {(destinationsQuery.data ?? []).map((store) => (
                          <ListBox.Item
                            id={String(store.id)}
                            key={store.id}
                            textValue={store.name}
                          >
                            {store.name}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </section>

                <section className="rounded-xl border border-border bg-pos-surface-soft p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">Productos</p>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-foreground/70 ring-1 ring-border">
                      {dispatchItems.length} {dispatchItems.length === 1 ? "agregado" : "agregados"}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                    <Input
                      className="h-10 w-full border border-border bg-background pl-9 text-foreground shadow-sm placeholder:text-foreground/55"
                      placeholder="Buscar y agregar producto"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  {search && (
                    <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-pos-surface text-foreground shadow-md">
                      {searchResults.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-foreground last:border-0 hover:bg-pos-surface-soft"
                          onClick={() => {
                            setDispatchItems((items) => [
                              ...items,
                              {
                                productVariantId: variant.id,
                                productName: variant.productName,
                                variantName: variant.name,
                                stock: variant.stock,
                                quantity: "",
                              },
                            ]);
                            setSearch("");
                          }}
                        >
                          <span className="truncate text-sm font-semibold text-foreground">
                            {variant.productName} · {variant.name}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-foreground/70">
                            Stock {variant.stock}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 min-h-40 space-y-2">
                    {dispatchItems.length === 0 ? (
                      <p className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border bg-background/60 px-3 py-4 text-center text-xs text-foreground/60">
                        Busca un producto para agregarlo al traslado.
                      </p>
                    ) : dispatchItems.map((item) => (
                      <div
                        key={item.productVariantId}
                        className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.25rem] items-center gap-2 rounded-lg border border-border bg-background p-2.5 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.productName} · {item.variantName}
                          </p>
                          <p className="text-[11px] font-medium text-foreground/65">
                            Disponible: {item.stock}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-1 block text-[11px] font-bold text-foreground/75">
                            Cantidad
                          </Label>
                          <Input
                            aria-label={`Cantidad de ${item.productName}`}
                            className="h-9 w-full border border-border bg-pos-surface text-center font-semibold text-foreground shadow-sm"
                            type="number"
                            min="1"
                            max={String(item.stock)}
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              setDispatchItems((items) =>
                                items.map((current) =>
                                  current.productVariantId === item.productVariantId
                                    ? { ...current, quantity: event.target.value }
                                    : current,
                                ),
                              )
                            }
                          />
                        </div>
                        <Button
                          isIconOnly
                          className="h-9 min-h-9 w-9 min-w-9 border border-border bg-pos-surface text-destructive"
                          variant="ghost"
                          aria-label={`Quitar ${item.productName}`}
                          onClick={() =>
                            setDispatchItems((items) =>
                              items.filter(
                                (current) =>
                                  current.productVariantId !== item.productVariantId,
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-pos-surface-soft p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">Observación</p>
                    <span className="text-xs text-foreground/55">Opcional</span>
                  </div>
                  <div className="w-full min-w-0 overflow-hidden">
                    <TextArea
                      aria-label="Observación de despacho"
                      className="block min-h-20 w-full min-w-0 max-w-full resize-none border border-border bg-background text-foreground placeholder:text-foreground/55"
                      rows={3}
                      placeholder="Agrega una nota sobre el traslado"
                      value={dispatchObservation}
                      onChange={(event) => setDispatchObservation(event.target.value)}
                    />
                  </div>
                </section>
              </Modal.Body>
              <Modal.Footer className="shrink-0 gap-2 border-t border-border bg-pos-surface px-4 py-3 text-foreground sm:px-5">
                <Button
                  className="border-border bg-background text-foreground"
                  variant="outline"
                  onClick={closeDispatch}
                >
                  Cancelar
                </Button>
                <Button
                  className="min-w-40 bg-primary text-primary-foreground"
                  isDisabled={!dispatchIsValid || dispatchMutation.isPending}
                  onClick={() =>
                    dispatchMutation.mutate({
                      destinationStoreId: Number(destinationStoreId),
                      observation: dispatchObservation.trim() || undefined,
                      items: dispatchItems.map((item) => ({
                        productVariantId: item.productVariantId,
                        quantity: Number(item.quantity),
                      })),
                    })
                  }
                >
                  {dispatchMutation.isPending
                    ? "Despachando..."
                    : "Confirmar despacho"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal><Modal.Backdrop isOpen={Boolean(receiveTransfer)}><Modal.Container size="2xl"><Modal.Dialog className="bg-pos-surface text-foreground">
        <Modal.Header><div><h2 className="text-xl font-bold">Recibir traslado #{receiveTransfer?.id}</h2><p className="text-sm text-muted-foreground">Confirma la cantidad física recibida de cada lote.</p></div></Modal.Header>
        <Modal.Body className="space-y-4">
          <div className="space-y-2">{receiveTransfer?.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_8rem] items-center gap-3 rounded-lg border border-border p-3"><div><p className="font-semibold">{item.productVariant.product.name} · {item.productVariant.name}</p><p className="text-xs text-muted-foreground">Lote {item.inventoryLot.code} · Enviado: {item.quantitySent}</p></div><Input aria-label={`Cantidad recibida del lote ${item.inventoryLot.code}`} type="number" min="0" step="1" value={receivedQuantities[item.id] ?? ""} onChange={(event) => setReceivedQuantities((values) => ({ ...values, [item.id]: event.target.value }))} /></div>)}</div>
          {hasDiscrepancy && <TextArea aria-label="Justificación de diferencia" placeholder="Explica el faltante o sobrante encontrado" value={discrepancyReason} onChange={(event) => setDiscrepancyReason(event.target.value)} />}
          <TextArea aria-label="Observación de recepción" placeholder="Observación opcional de la recepción" value={receptionObservation} onChange={(event) => setReceptionObservation(event.target.value)} />
        </Modal.Body>
        <Modal.Footer><Button variant="outline" onClick={closeReception}>Cancelar</Button><Button className="bg-primary text-primary-foreground" isDisabled={receptionHasInvalidQuantity || (hasDiscrepancy && !discrepancyReason.trim()) || receiveMutation.isPending} onClick={() => receiveTransfer && receiveMutation.mutate({ transferId: receiveTransfer.id, data: { items: receptionItems, observation: receptionObservation.trim() || undefined, discrepancyReason: discrepancyReason.trim() || undefined } })}>{receiveMutation.isPending ? "Recibiendo..." : "Confirmar recepción"}</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
    </div>
  );
};

export default InventoryTransfersPage;
