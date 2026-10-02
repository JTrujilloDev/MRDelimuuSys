import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import { ArrowLeft, ClipboardCheck, RefreshCw } from "lucide-react";
import axios from "axios";
import { api } from "../../../shared/services/api";
import { useAuth } from "../../../app/auth/AuthProvider";

type Phase = "OPENING" | "CLOSING";
type Product = { productVariantId: number; productName: string; unit: string; expectedQuantity: number; movementRevision: number };
type CountItem = Product & { id: number; countedQuantity: number; difference: number; justification: string | null; countedAt: string; countedByUserId: number; countedByUser?: { name: string }; resolvedByUser?: { name: string }; resolution: string | null; resolutionReason: string | null; adjustmentOperationId: string | null };
type Count = { phase: Phase; confirmedAt: string | null; confirmedByUser?: { name: string }; items: CountItem[]; archivedVerifications: Array<{ confirmedAt: string; items: CountItem[] }> };
type CountData = { register: { status: string }; products: Product[]; counts: Count[] };
const units: Record<string, string> = { UNIT: "unidades", PIECE: "piezas", GRAM: "gramos", KILOGRAM: "kg", LITER: "litros", MILLILITER: "ml", BOX: "cajas", PACK: "paquetes" };
const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const message = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message ?? "No fue posible guardar el conteo." : error instanceof Error ? error.message : "No fue posible guardar el conteo.";
const readCount = async (id: number): Promise<CountData> => (await api.get(`cash-register/${id}/inventory-count`)).data.data;

export const InventoryCountStatus = ({ cashRegisterId, onOpen }: { cashRegisterId: number; onOpen: () => void }) => {
  const { data } = useQuery({ queryKey: ["shiftInventory", cashRegisterId], queryFn: () => readCount(cashRegisterId), refetchInterval: 10000 });
  const opening = data?.counts.find(count => count.phase === "OPENING")?.confirmedAt;
  const final = data?.counts.find(count => count.phase === "CLOSING");
  const finalStale = final?.confirmedAt && data?.products.some(product => {
    const item = final.items.find(item => item.productVariantId === product.productVariantId);
    return !item || item.expectedQuantity !== product.expectedQuantity || item.movementRevision !== product.movementRevision;
  });
  const status = !data ? "Verificación de inventario" : !opening
    ? "Conteo inicial pendiente · Puedes continuar vendiendo"
    : finalStale ? "Conteo final requiere nueva verificación"
    : final?.confirmedAt ? "Conteos inicial y final confirmados" : "Conteo inicial confirmado · Final pendiente";
  return <button onClick={onOpen} className="mx-6 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-pos-surface px-4 py-3 text-left text-sm text-foreground hover:bg-secondary">
    <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />{status}</span>
    <span className="font-semibold text-primary">Ver conteos</span>
  </button>;
};

export default function InventoryCountView({ cashRegisterId, onBack, initialPhase = "OPENING", readOnly = false }: {
  cashRegisterId: number; onBack: () => void; initialPhase?: Phase; readOnly?: boolean;
}) {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading, error: loadError, refetch } = useQuery({ queryKey: ["shiftInventory", cashRegisterId], queryFn: () => readCount(cashRegisterId) });
  const count = data?.counts.find(count => count.phase === phase);
  const openingComplete = Boolean(data?.counts.find(count => count.phase === "OPENING")?.confirmedAt);
  const closed = data?.register.status === "CLOSED";
  const editable = !readOnly && !closed && !count?.confirmedAt && (phase === "OPENING" || openingComplete);
  const products = closed || readOnly ? (count?.items ?? []) : (data?.products ?? []);
  const visible = products.filter(product => product.productName.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["shiftInventory", cashRegisterId] });
    await queryClient.invalidateQueries({ queryKey: ["openCashRegister"] });
  };
  const act = async (action: "confirm" | "reopen") => {
    setBusy(true); setError("");
    try { await api.post(`cash-register/inventory-count/${action}`, { cashRegisterId, phase }); await refresh(); }
    catch (error) { setError(message(error)); await refetch(); }
    finally { setBusy(false); }
  };
  return <main className="h-full overflow-y-auto bg-background p-4 sm:p-6">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex items-center gap-3"><Button variant="secondary" onPress={onBack} aria-label="Volver"><ArrowLeft className="h-4 w-4" />Volver</Button><div><h1 className="text-xl font-bold text-foreground">Verificación de inventario</h1><p className="text-sm text-muted-foreground">Turno #{cashRegisterId} · Las diferencias no cambian el stock automáticamente.</p></div></header>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Momento del conteo">
        {(["OPENING", "CLOSING"] as Phase[]).map(value => <button key={value} role="tab" aria-selected={phase === value} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${phase === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-pos-surface text-foreground hover:bg-secondary"}`} onClick={() => { setPhase(value); setError(""); }}>
          {value === "OPENING" ? "Conteo inicial" : "Conteo final"} · {data?.counts.find(count => count.phase === value)?.confirmedAt ? "Confirmado" : "Pendiente"}
        </button>)}
      </div>
      <section className="rounded-2xl border border-border bg-pos-surface p-5">
        <p className="text-sm text-foreground">{phase === "OPENING" ? "Puedes volver al POS para atender clientes y continuar después. Cada producto se compara con el inventario vigente al verificarlo." : "Completa el conteo inicial antes del final. Si hay movimientos posteriores, vuelve a verificar los productos afectados antes de cerrar."}</p>
        <p className="mt-2 text-xs text-muted-foreground">Se cuentan productos terminados y de terceros con inventario inicializado, incluidos los desactivados con existencias. Ingredientes, bases y empaques no forman parte de esta verificación.</p>
        {count?.confirmedAt && <p className="mt-3 text-sm font-semibold text-primary">Confirmado el {new Date(count.confirmedAt).toLocaleString("es-CO")} · {count.confirmedByUser?.name}</p>}
        {phase === "CLOSING" && !openingComplete && !readOnly && !closed && <p className="mt-3 text-sm text-danger">Primero completa y confirma el conteo inicial.</p>}
      </section>
      {(error || loadError) && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error || message(loadError)}</p>}
      <div className="flex items-center gap-3"><input aria-label="Buscar producto en el conteo" className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto…" /><Button variant="secondary" onPress={() => void refetch()} aria-label="Actualizar inventario"><RefreshCw className="h-4 w-4" /></Button></div>
      <div className="space-y-3">
        {isLoading && <p className="p-6 text-muted-foreground">Cargando inventario…</p>}
        {!isLoading && !visible.length && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">{products.length ? "No hay coincidencias." : closed || readOnly ? "Este turno no tiene productos contados en esta etapa." : "No hay productos con inventario inicializado para contar. Confirma igualmente esta etapa."}</p>}
        {visible.map(product => <CountRow key={`${phase}-${product.productVariantId}`} product={product} item={count?.items.find(item => item.productVariantId === product.productVariantId)} phase={phase} cashRegisterId={cashRegisterId} editable={editable && !busy} review={Boolean(state?.user.isGlobalAdmin && closed && count?.confirmedAt)} readFresh={() => readCount(cashRegisterId)} onSaved={refresh} />)}
      </div>
      {!readOnly && !closed && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-pos-surface p-5">
        <p className="text-sm text-muted-foreground">{products.filter(product => count?.items.some(item => item.productVariantId === product.productVariantId)).length} de {products.length} productos verificados</p>
        {count?.confirmedAt ? phase === "CLOSING" && <Button variant="secondary" isDisabled={busy} onPress={() => void act("reopen")}>Reabrir verificación final</Button> : <Button isDisabled={busy || !data || (phase === "CLOSING" && !openingComplete)} onPress={() => void act("confirm")}>{busy ? "Guardando…" : "Confirmar conteo completo"}</Button>}
      </div>}
      {!!count?.archivedVerifications?.length && <details className="rounded-2xl border border-border bg-pos-surface p-5"><summary className="cursor-pointer font-semibold text-foreground">Verificaciones finales anteriores ({count.archivedVerifications.length})</summary>{count.archivedVerifications.map((archive, index) => <div key={index} className="mt-4 border-t border-border pt-3"><p className="text-sm font-semibold text-foreground">{new Date(archive.confirmedAt).toLocaleString("es-CO")}</p>{archive.items.map(item => <p key={item.id} className="mt-1 text-sm text-muted-foreground">{item.productName}: esperado {item.expectedQuantity}, contado {item.countedQuantity}, diferencia {item.difference}. {item.justification}</p>)}</div>)}</details>}
    </div>
  </main>;
}

function CountRow({ product, item, phase, cashRegisterId, editable, review, readFresh, onSaved }: {
  product: Product; item?: CountItem; phase: Phase; cashRegisterId: number; editable: boolean; review: boolean;
  readFresh: () => Promise<CountData>; onSaved: () => Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState("EXPLAINED");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stale = phase === "CLOSING" && item && (item.movementRevision !== product.movementRevision || item.expectedQuantity !== product.expectedQuantity);
  const begin = async () => {
    setBusy(true); setError("");
    try {
      const fresh = (await readFresh()).products.find(value => value.productVariantId === product.productVariantId);
      if (!fresh) throw new Error("El producto ya no está disponible para contar.");
      setSnapshot(fresh); setQuantity(""); setReason("");
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError("");
    try {
      if (!snapshot) throw new Error("Actualiza el producto antes de guardar.");
      if (!/^\d+$/.test(quantity)) throw new Error("Ingresa la cantidad contada. Un campo vacío no significa cero.");
      await api.post("cash-register/inventory-count/item", { cashRegisterId, phase, ...snapshot, countedQuantity: Number(quantity), justification: reason });
      setSnapshot(null); await onSaved();
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  };
  const resolve = async () => {
    if (!item) return;
    setBusy(true); setError("");
    try {
      if (!reason.trim()) throw new Error("Indica el motivo de la revisión.");
      const fresh = (await readFresh()).products.find(value => value.productVariantId === product.productVariantId);
      await api.post(`cash-register/inventory-count-items/${item.id}/resolve`, { resolution, reason, expectedQuantity: fresh?.expectedQuantity, movementRevision: fresh?.movementRevision });
      setReviewing(false); await onSaved();
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  };
  return (
    <article className="rounded-2xl border border-border bg-pos-surface p-5 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{product.productName}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{units[product.unit] ?? product.unit}</p>
        </div>
        {editable && (
          <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => void begin()}>
            {item ? "Volver a verificar" : "Contar"}
          </Button>
        )}
      </div>
      {item && (
        <div className="mt-4 space-y-1">
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-secondary/50 p-3 text-sm">
            <span>Esperado <strong className="block">{item.expectedQuantity}</strong></span>
            <span>Contado <strong className="block">{item.countedQuantity}</strong></span>
            <span>Diferencia <strong className={`block ${item.difference ? "text-danger" : "text-success"}`}>
              {item.difference > 0 ? "+" : ""}{item.difference}
            </strong></span>
          </div>
          <p className="text-xs text-muted-foreground">
            Verificado: {new Date(item.countedAt).toLocaleString("es-CO")} · {item.countedByUser?.name ?? `Usuario #${item.countedByUserId}`}
          </p>
          {item.justification && <p className="text-sm">{item.justification}</p>}
          {item.difference !== 0 && (
            <p className="text-sm text-muted-foreground">
              {item.resolution
                ? `Resuelta: ${item.resolution === "ADJUSTMENT" ? "ajuste registrado" : item.resolution === "COUNT_ERROR" ? "error de conteo" : "diferencia explicada"}. ${item.resolutionReason} · ${item.resolvedByUser?.name ?? "Administrador general"}`
                : "Pendiente de revisión del administrador general"}
            </p>
          )}
        </div>
      )}
      {stale && !review && (
        <p className="mt-2 text-sm text-danger">Hubo movimientos posteriores. Reabre el conteo si está confirmado y vuelve a verificar este producto.</p>
      )}
      {snapshot && editable && (
        <div className="mt-4 space-y-3 rounded-xl border border-primary/30 p-4">
          <p className="text-sm">Esperado al comenzar esta verificación: <strong>{snapshot.expectedQuantity}</strong></p>
          <label className="block text-sm">Cantidad física
            <input autoFocus type="number" min="0" step="1" className={`${inputClass} mt-1`} value={quantity} onChange={event => setQuantity(event.target.value)} />
          </label>
          {/^\d+$/.test(quantity) && Number.isSafeInteger(Number(quantity)) && (
            <p className="text-sm">Diferencia: <strong>{Number(quantity) - snapshot.expectedQuantity}</strong></p>
          )}
          <label className="block text-sm">Justificación de la diferencia
            <textarea className={`${inputClass} mt-1 min-h-20 resize-y`} value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} placeholder="Obligatoria cuando el conteo no coincide" />
          </label>
          <div className="flex gap-2">
            <Button isDisabled={busy || quantity === ""} onPress={() => void save()}>Guardar verificación</Button>
            <Button variant="secondary" onPress={() => setSnapshot(null)}>Cancelar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Si se mueve este producto mientras cuentas, pulsa «{item ? "Volver a verificar" : "Contar"}» y repite el conteo antes de guardar.</p>
        </div>
      )}
      {review && item && item.difference !== 0 && !item.resolution && !reviewing && (
        <Button className="mt-3" variant="secondary" onPress={() => { setReviewing(true); setReason(""); }}>Revisar diferencia</Button>
      )}
      {reviewing && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">Resolución
            <select className={`${inputClass} mt-1`} value={resolution} onChange={event => setResolution(event.target.value)}>
              <option value="EXPLAINED">Diferencia explicada / movimiento registrado</option>
              <option value="COUNT_ERROR">Error de conteo</option>
              {phase === "CLOSING" && <option value="ADJUSTMENT">Aplicar ajuste de inventario</option>}
            </select>
          </label>
          <label className="block text-sm">Motivo o referencia del movimiento
            <textarea className={`${inputClass} mt-1 min-h-20`} value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} />
          </label>
          {resolution === "ADJUSTMENT" && (
            <p className="text-sm text-danger">El ajuste cambia el stock por {item?.difference} {units[product.unit]}. Solo procede si no hubo movimientos posteriores; los sobrantes ingresan sin lote identificado.</p>
          )}
          <div className="flex gap-2">
            <Button isDisabled={busy || !reason.trim()} onPress={() => void resolve()}>Confirmar resolución</Button>
            <Button variant="secondary" onPress={() => setReviewing(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    </article>
  );
}
