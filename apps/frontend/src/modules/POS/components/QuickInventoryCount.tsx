import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import axios from "axios";
import { api } from "../../../shared/services/api";
import { parseCountQuantity } from "../utils/quickInventoryCount.rules";

export type CountProduct = { productVariantId: number; productName: string; unit: string; expectedQuantity: number; movementRevision: number };
type SavedItem = CountProduct & { countedQuantity: number; justification: string | null };
type Draft = { quantity: string; reason: string; snapshot?: CountProduct; dirty: boolean; status: "loading" | "editing" | "saving" | "saved" | "error"; error?: string; stale?: boolean };
const fieldClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const unitLabels: Record<string, string> = { UNIT: "unidades", PIECE: "piezas", GRAM: "gramos", KILOGRAM: "kg", LITER: "litros", MILLILITER: "ml", BOX: "cajas", PACK: "paquetes" };

export default function QuickInventoryCount({ products, items, search, phase, cashRegisterId, readFresh, onSaved, onStateChange, disabled = false }: {
  products: CountProduct[]; items: SavedItem[]; search: string; phase: "OPENING" | "CLOSING"; cashRegisterId: number;
  readFresh: () => Promise<{ products: CountProduct[] }>;
  onSaved: () => Promise<void>; onStateChange: (blocked: boolean) => void;
  disabled?: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draftRef = useRef<Record<string, Draft>>({});
  const quantities = useRef<Record<string, HTMLInputElement | null>>({});
  const reasons = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const requests = useRef<Record<string, Promise<void> | undefined>>({});
  const keyFor = (id: number) => `${phase}-${id}`;
  const visible = products.filter(product => product.productName.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const update = (key: string, value: Draft) => {
    draftRef.current = { ...draftRef.current, [key]: value };
    setDrafts(draftRef.current);
    onStateChange(Object.values(draftRef.current).some(draft => draft.dirty || draft.status === "loading" || draft.status === "saving" || draft.status === "error"));
  };
  const begin = async (product: CountProduct, reset = false) => {
    if (disabled) return;
    const key = keyFor(product.productVariantId);
    const old = draftRef.current[key];
    if (requests.current[key]) return requests.current[key];
    if (!reset && old?.snapshot && old.status !== "saved") return;
    const item = items.find(item => item.productVariantId === product.productVariantId);
    const base: Draft = { quantity: reset ? "" : old?.quantity ?? (item ? String(item.countedQuantity) : ""), reason: reset ? "" : old?.reason ?? item?.justification ?? "", dirty: false, status: "loading" };
    update(key, base);
    const request = (async () => {
      try {
        const snapshot = (await readFresh()).products.find(item => item.productVariantId === product.productVariantId);
        if (!snapshot) throw new Error("El producto ya no está disponible para contar.");
        // A fast input event can arrive before the loading lock is rendered.
        // Refresh only the reference; never replace text already entered.
        update(key, { ...(draftRef.current[key] ?? base), snapshot, status: "editing" });
      } catch { update(key, { ...(draftRef.current[key] ?? base), status: "error", error: "No se pudo actualizar la referencia. Vuelve a intentarlo.", stale: true }); }
      finally { requests.current[key] = undefined; }
    })();
    requests.current[key] = request;
    return request;
  };
  const focusNext = (id: number) => {
    const index = visible.findIndex(product => product.productVariantId === id);
    const next = visible[index + 1];
    requestAnimationFrame(() => {
      if (next) { quantities.current[keyFor(next.productVariantId)]?.focus(); quantities.current[keyFor(next.productVariantId)]?.select(); }
      else document.getElementById("confirm-inventory-count")?.focus();
    });
  };
  const save = async (product: CountProduct, advance: boolean, force = false) => {
    if (disabled) return;
    const key = keyFor(product.productVariantId);
    if (requests.current[key]) await requests.current[key];
    const draft = draftRef.current[key];
    if (!draft || draft.status === "saving" || (!force && !draft.dirty)) return;
    const quantity = parseCountQuantity(draft.quantity);
    if (!draft.snapshot || draft.stale) return;
    if (quantity === null) {
      update(key, { ...draft, status: "error", error: "Ingresa una cantidad entera válida. Vacío no significa cero." });
      if (advance) quantities.current[key]?.focus();
      return;
    }
    if (quantity !== draft.snapshot.expectedQuantity && !draft.reason.trim()) {
      update(key, { ...draft, status: "error", error: "Justifica la diferencia para guardar esta fila." });
      if (advance) reasons.current[key]?.focus();
      return;
    }
    update(key, { ...draft, status: "saving", error: undefined });
    try {
      await api.post("cash-register/inventory-count/item", { cashRegisterId, phase, ...draft.snapshot, countedQuantity: quantity, justification: draft.reason });
      await onSaved();
      update(key, { ...draft, dirty: false, status: "saved", error: undefined });
      if (advance) focusNext(product.productVariantId);
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      update(key, { ...draft, status: "error", error: detail ?? "No se pudo guardar. La cantidad sigue en esta fila para reintentar.", stale: typeof detail === "string" && detail.includes("inventario cambió") });
    }
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, product: CountProduct) => {
    if (disabled) return;
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      const draft = draftRef.current[keyFor(product.productVariantId)];
      if (event.key === "Tab" && !draft?.quantity && !draft?.dirty) { focusNext(product.productVariantId); return; }
      void save(product, true, true);
    }
  };
  return <div className="overflow-hidden rounded-2xl border border-border bg-pos-surface">
    <div className="hidden grid-cols-[minmax(180px,1fr)_100px_150px_110px_150px] gap-4 border-b border-border bg-secondary/50 px-5 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid" aria-hidden="true">
      <span>Producto</span><span>Esperado</span><span>Cantidad física</span><span>Diferencia</span><span>Estado</span>
    </div>
    {products.map(product => {
      const key = keyFor(product.productVariantId);
      const draft = drafts[key];
      const item = items.find(item => item.productVariantId === product.productVariantId);
      const quantity = draft?.quantity ?? (item ? String(item.countedQuantity) : "");
      const reason = draft?.reason ?? item?.justification ?? "";
      const expected = draft?.snapshot?.expectedQuantity ?? (item?.expectedQuantity ?? product.expectedQuantity);
      const numeric = parseCountQuantity(quantity);
      const difference = numeric === null ? null : numeric - expected;
      // Allow typing while the reference loads; save waits for that request.
      // Locking on focus would swallow the first keystrokes on a slow connection.
      const locked = disabled || draft?.status === "saving";
      const outdated = phase === "CLOSING" && item && (item.expectedQuantity !== product.expectedQuantity || item.movementRevision !== product.movementRevision);
      const label = draft?.status === "loading" ? "Actualizando referencia…" : draft?.status === "saving" ? "Guardando…" : draft?.status === "error" ? "Revisar fila" : draft?.dirty ? "Sin guardar" : item || draft?.status === "saved" ? "Guardado" : "Pendiente";
      return <div key={key} hidden={!visible.some(item => item.productVariantId === product.productVariantId)} className="border-b border-border px-5 py-4 last:border-b-0">
        <div className="grid items-center gap-3 lg:grid-cols-[minmax(180px,1fr)_100px_150px_110px_150px] lg:gap-4">
          <div><p className="font-semibold text-foreground">{product.productName}</p><p className="text-xs text-muted-foreground">{unitLabels[product.unit] ?? product.unit}</p></div>
          <p className="text-sm text-foreground"><span className="mr-2 text-muted-foreground lg:hidden">Esperado:</span>{expected}</p>
          <input ref={element => { quantities.current[key] = element; }} aria-label={`Cantidad física de ${product.productName}`} type="number" min="0" step="1" placeholder="Sin contar" className={fieldClass} value={quantity} readOnly={locked} onFocus={() => void begin(product)} onChange={event => {
            const current = draftRef.current[key];
            if (current) update(key, { ...current, quantity: event.target.value, dirty: true, status: "editing", error: undefined });
          }} onKeyDown={event => keyDown(event, product)} onBlur={() => void save(product, false)} />
          <p className={`text-sm font-semibold ${difference ? "text-danger" : "text-foreground"}`}><span className="mr-2 font-normal text-muted-foreground lg:hidden">Diferencia:</span>{difference === null ? "—" : difference > 0 ? `+${difference}` : difference}</p>
          <p className={`text-xs ${draft?.status === "error" ? "text-danger" : "text-muted-foreground"}`} role="status">{label}</p>
        </div>
        {difference !== null && difference !== 0 && <label className="mt-3 block text-sm text-foreground">Justificación · {product.productName}
          <textarea ref={element => { reasons.current[key] = element; }} aria-label={`Justificación de ${product.productName}`} className={`${fieldClass} mt-1 min-h-16 resize-y`} placeholder="Explica la diferencia y pulsa Enter" maxLength={2000} value={reason} readOnly={locked} onChange={event => {
            const current = draftRef.current[key];
            if (current) update(key, { ...current, reason: event.target.value, dirty: true, status: "editing", error: undefined });
          }} onKeyDown={event => keyDown(event, product)} onBlur={() => void save(product, false)} />
        </label>}
        {draft?.error && <p role="alert" className="mt-2 text-sm text-danger">{draft.error}</p>}
        {outdated && !draft?.error && <p className="mt-2 text-sm text-danger">Hay movimientos posteriores a esta verificación. Entra al campo, vuelve a contar y confirma la cantidad con Enter.</p>}
        {draft?.stale ? <button className="mt-2 text-sm font-semibold text-primary underline" onClick={() => { void begin(product, true).then(() => quantities.current[key]?.focus()); }}>Actualizar y volver a contar</button>
          : draft?.status === "error" && draft.dirty && <button className="mt-2 text-sm font-semibold text-primary underline" onClick={() => void save(product, false, true)}>Reintentar guardado</button>}
      </div>;
    })}
  </div>;
}
