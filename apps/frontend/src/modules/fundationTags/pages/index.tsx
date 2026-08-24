import { useMemo, useState } from "react";
import { Button, Modal, toast } from "@heroui/react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import { BookOpen, Check, ClipboardList, Minus, Plus, Printer, RotateCcw, Tag, Trash2 } from "lucide-react";
import { printLabelService } from "../../../shared/services/qz.service";
import { foundationMenu } from "../../../shared/constants/fundationMenu";
import { foundationProducts } from "../../../shared/constants/fundationProducts";

dayjs.extend(isoWeek);
dayjs.locale("es");

type ProductKey = keyof typeof foundationProducts;
type Product = (typeof foundationProducts)[ProductKey];
type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DraftLabel = { id: string; productKey: ProductKey; amount: number; enabled: boolean; targetId: string; targetLabel: string };
type DeliveryTarget = { id: string; date: dayjs.Dayjs; week: number; day: DayKey; label: string };

const REFERENCE_WEEK_START = dayjs("2026-08-24").startOf("isoWeek");
const dayKeys: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const productEntries = Object.entries(foundationProducts) as [ProductKey, Product][];

const menuWeekFor = (date: dayjs.Dayjs) => {
  const weeksFromReference = date.startOf("isoWeek").diff(REFERENCE_WEEK_START, "week");
  return (((2 + weeksFromReference) % 3) + 3) % 3 + 1;
};

const deliveryTargets = [1, 2].map((offset): DeliveryTarget => {
  const date = dayjs().add(offset, "day");
  return {
    id: date.format("YYYY-MM-DD"),
    date,
    week: menuWeekFor(date),
    day: dayKeys[date.isoWeekday() - 1],
    label: date.format("dddd D [de] MMMM"),
  };
});

const productKeyOf = (product: Product): ProductKey =>
  productEntries.find(([, candidate]) => candidate === product)?.[0] ?? productEntries[0][0];

const suggestionFor = (target: DeliveryTarget): DraftLabel[] => {
  const day = foundationMenu.find((week) => week.week === target.week)!.days[target.day];
  return Object.values(day.meals)
    .filter((product): product is Product => Boolean(product))
    .map((product, index) => ({
      id: `${target.id}-${index}-${productKeyOf(product)}`,
      productKey: productKeyOf(product),
      amount: product.labelAmount,
      enabled: true,
      targetId: target.id,
      targetLabel: target.label,
    }));
};

const FoundationTags = () => {
  const [activeTargetIds, setActiveTargetIds] = useState(() => new Set(deliveryTargets.map((target) => target.id)));
  const [draft, setDraft] = useState<DraftLabel[]>(() => deliveryTargets.flatMap(suggestionFor));
  const [isPrinting, setIsPrinting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const selectedLabels = draft.filter((item) => item.enabled && item.amount > 0);
  const totalLabels = selectedLabels.reduce((total, item) => total + item.amount, 0);
  const selectedKeys = useMemo(() => new Set(draft.map((item) => item.productKey)), [draft]);
  const preparationDay = dayjs().format("DD/MM/YYYY");
  const expirationDay = dayjs().add(5, "day").format("DD/MM/YYYY");
  const lotBase = dayjs().format("YYYYMMDD");

  const toggleTarget = (target: DeliveryTarget) => {
    const isActive = activeTargetIds.has(target.id);
    setActiveTargetIds((current) => {
      const next = new Set(current);
      if (isActive) next.delete(target.id); else next.add(target.id);
      return next;
    });
    setDraft((current) => isActive
      ? current.filter((item) => item.targetId !== target.id)
      : [...current, ...suggestionFor(target)]);
  };
  const restoreSuggestion = () => setDraft(deliveryTargets.filter((target) => activeTargetIds.has(target.id)).flatMap(suggestionFor));
  const updateDraft = (id: string, changes: Partial<DraftLabel>) =>
    setDraft((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const addProduct = () => {
    const productKey = productEntries.find(([key]) => !selectedKeys.has(key))?.[0] ?? productEntries[0][0];
    const target = deliveryTargets.find((item) => activeTargetIds.has(item.id)) ?? deliveryTargets[0];
    setDraft((current) => [...current, { id: `custom-${Date.now()}`, productKey, amount: foundationProducts[productKey].labelAmount, enabled: true, targetId: target.id, targetLabel: target.label }]);
  };
  const createLabel = (product: Product, amount: number) => [
    "SIZE 50 mm,30 mm", "GAP 2 mm,0", "HOME", "CLS",
    `TEXT 2,20,"2",0,2,1,"${product.name}"`,
    `TEXT 2,55,"2",0,1,1,"${product.content}"`,
    `TEXT 25,90,"2",0,1,1,"Elab. ${preparationDay}"`,
    `TEXT 25,115,"2",0,1,1,"Venc. ${expirationDay}"`,
    `TEXT 25,145,"2",0,1,1,"Lote: ${lotBase}${product.lotRef}01"`,
    "TEXT 5,170,\"2\",0,1,1,\"Fabricado por Delimuu\"",
    "TEXT 5,195,\"2\",0,1,1,\"NIT 79.062.341-1\"",
    `PRINT ${amount}`,
  ].join("\r\n");
  const handlePrint = async () => {
    if (!selectedLabels.length) return;
    setIsPrinting(true);
    try {
      await printLabelService("TSCE210", selectedLabels.map((item) => createLabel(foundationProducts[item.productKey], item.amount)).join("\r\n"));
      toast("Etiquetas enviadas a impresión", { variant: "success", description: `${totalLabels} etiquetas de ${selectedLabels.length} productos.` });
    } catch (error) {
      toast("No se pudieron imprimir las etiquetas", { variant: "danger", description: error instanceof Error ? error.message : "Verifica la conexión con la impresora." });
    } finally { setIsPrinting(false); }
  };

  return (
    <main className="h-full overflow-y-auto bg-background p-5 lg:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-[28px] border border-border bg-pos-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Tag className="h-7 w-7" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Fundación</p><h1 className="text-2xl font-black text-foreground">Etiquetas de producción</h1><p className="mt-1 text-sm text-muted-foreground">Usa la minuta como punto de partida y ajusta el lote antes de imprimir.</p></div>
          </div>
          <div className="flex gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Elaboración</p><p className="font-bold text-foreground">{preparationDay}</p></div>
            <div className="border-l border-border pl-3"><p className="text-xs text-muted-foreground">Vencimiento</p><p className="font-bold text-foreground">{expirationDay}</p></div>
          </div>
        </header>

        <section className="rounded-[24px] border border-border bg-pos-surface p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-bold text-foreground">Días de entrega incluidos</h2><p className="text-xs text-muted-foreground">Puedes preparar la minuta de mañana, pasado mañana o ambas.</p></div>
            <Button variant="outline" size="sm" onClick={() => setIsMenuOpen(true)}><BookOpen className="h-4 w-4" /> Ver minuta completa</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{deliveryTargets.map((target) => {
            const active = activeTargetIds.has(target.id);
            const menuDay = foundationMenu.find((week) => week.week === target.week)!.days[target.day];
            const count = Object.values(menuDay.meals).filter(Boolean).length;
            return <button key={target.id} type="button" onClick={() => toggleTarget(target)} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${active ? "border-primary bg-primary/10 ring-2 ring-primary/15" : "border-border bg-background opacity-65 hover:border-primary/40"}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{active && <Check className="h-5 w-5" />}</span>
              <span className="min-w-0 flex-1"><span className={`block text-lg font-black capitalize ${active ? "text-primary" : "text-foreground"}`}>{target.label}</span><span className="block text-sm text-muted-foreground">Semana {target.week} · {count} {count === 1 ? "producto" : "productos"}</span></span>
            </button>;
          })}</div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-[24px] border border-border bg-pos-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div><h2 className="text-lg font-black text-foreground">Lote sugerido</h2><p className="text-sm text-muted-foreground">Activa solamente los productos que deseas imprimir.</p></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={restoreSuggestion}><RotateCcw className="h-4 w-4" /> Restaurar sugerencia</Button><Button size="sm" onClick={addProduct} isDisabled={!activeTargetIds.size}><Plus className="h-4 w-4" /> Agregar producto</Button></div>
            </div>
            <div className="space-y-3 p-4">{draft.map((item) => {
              const product = foundationProducts[item.productKey];
              return <article key={item.id} className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-[auto_minmax(220px,1fr)_minmax(180px,0.8fr)_auto] md:items-center ${item.enabled ? "border-border bg-background" : "border-border/60 bg-secondary/30 opacity-65"}`}>
                <button type="button" aria-label={item.enabled ? `Excluir ${product.name}` : `Incluir ${product.name}`} onClick={() => updateDraft(item.id, { enabled: !item.enabled })} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.enabled ? "border-success bg-success text-success-foreground" : "border-border bg-secondary text-muted-foreground"}`}>{item.enabled && <Check className="h-5 w-5" />}</button>
                <div className="min-w-0"><select value={item.productKey} onChange={(event) => { const productKey = event.target.value as ProductKey; updateDraft(item.id, { productKey, amount: foundationProducts[productKey].labelAmount }); }} className="h-10 w-full rounded-xl border border-border bg-pos-surface px-3 font-bold text-foreground outline-none focus:border-primary">{productEntries.map(([key, option]) => <option key={key} value={key}>{option.name}</option>)}</select><p className="mt-1 truncate text-xs text-muted-foreground">{product.content}</p><p className="mt-1 text-xs font-bold capitalize text-primary">Entrega: {item.targetLabel}</p></div>
                <div><p className="mb-1.5 text-xs font-semibold text-muted-foreground">Cantidad de etiquetas</p><div className="flex h-10 items-center rounded-xl border border-border bg-pos-surface"><button type="button" aria-label="Restar etiqueta" onClick={() => updateDraft(item.id, { amount: Math.max(1, item.amount - 1) })} className="flex h-full w-10 items-center justify-center text-muted-foreground hover:text-primary"><Minus className="h-4 w-4" /></button><input type="number" min="1" max="999" value={item.amount} onChange={(event) => updateDraft(item.id, { amount: Math.max(1, Math.min(999, Number(event.target.value) || 1)) })} className="h-full min-w-0 flex-1 bg-transparent text-center text-lg font-black text-foreground outline-none" /><button type="button" aria-label="Sumar etiqueta" onClick={() => updateDraft(item.id, { amount: Math.min(999, item.amount + 1) })} className="flex h-full w-10 items-center justify-center text-muted-foreground hover:text-primary"><Plus className="h-4 w-4" /></button></div></div>
                <button type="button" aria-label={`Quitar ${product.name}`} onClick={() => setDraft((current) => current.filter((draftItem) => draftItem.id !== item.id))} className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-5 w-5" /></button>
              </article>;
            })}{!draft.length && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No hay productos en el lote. Agrega uno para comenzar.</div>}</div>
          </section>

          <aside className="sticky top-5 overflow-hidden rounded-[24px] border border-border bg-pos-order-bg text-pos-order-fg shadow-lg">
            <div className="border-b border-white/10 p-5"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-pos-order-fg/60"><ClipboardList className="h-4 w-4" /> Resumen de impresión</p><p className="mt-2 text-3xl font-black">{totalLabels}</p><p className="text-sm text-pos-order-fg/60">etiquetas · {selectedLabels.length} productos</p></div>
            <div className="max-h-72 space-y-2 overflow-y-auto p-5">{selectedLabels.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><span className="block truncate text-pos-order-fg/75">{foundationProducts[item.productKey].name}</span><span className="block truncate text-xs capitalize text-pos-order-fg/45">{item.targetLabel}</span></span><span className="rounded-lg bg-white/10 px-2 py-1 font-black">× {item.amount}</span></div>)}{!selectedLabels.length && <p className="py-4 text-center text-sm text-pos-order-fg/50">Selecciona al menos un producto.</p>}</div>
            <div className="border-t border-white/10 p-5"><button type="button" disabled={!selectedLabels.length || isPrinting} onClick={() => void handlePrint()} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-lg font-black text-primary-foreground hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Printer className="h-6 w-6" /> {isPrinting ? "Imprimiendo…" : "Imprimir lote"}</button></div>
          </aside>
        </div>
      </div>

      <Modal>
        <Modal.Backdrop isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <Modal.Container size="5xl" scroll="inside">
            <Modal.Dialog className="max-h-[90vh] rounded-[28px] bg-pos-surface">
              <Modal.CloseTrigger
                aria-label="Cerrar minuta"
                className="right-5 top-5 rounded-full border border-border bg-secondary p-2 text-foreground shadow-sm transition-colors hover:bg-muted"
              />
              <Modal.Header className="border-b border-border px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Referencia</p>
                  <Modal.Heading className="text-2xl font-black text-foreground">Minuta completa de Fundación</Modal.Heading>
                  <p className="mt-1 text-sm text-muted-foreground">Ciclo de tres semanas y productos sugeridos por día.</p>
                </div>
              </Modal.Header>
              <Modal.Body className="space-y-6 px-6 py-5">
                {foundationMenu.map((week) => (
                  <section key={week.week}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground">{week.week}</span>
                      <h3 className="text-lg font-black text-foreground">Semana {week.week}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                      {dayKeys.map((dayKey) => {
                        const day = week.days[dayKey];
                        const products = Object.values(day.meals).filter((product): product is Product => Boolean(product));
                        return (
                          <article key={dayKey} className="rounded-2xl border border-border bg-background p-3">
                            <h4 className="border-b border-border pb-2 font-black text-foreground">{day.name}</h4>
                            <div className="mt-3 space-y-2">
                              {products.map((product, index) => (
                                <div key={`${product.name}-${index}`} className="rounded-xl bg-secondary px-3 py-2">
                                  <p className="text-sm font-bold text-foreground">{product.name}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{product.labelAmount} etiquetas</p>
                                </div>
                              ))}
                              {!products.length && <p className="py-3 text-center text-xs text-muted-foreground">Sin productos</p>}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </main>
  );
};

export default FoundationTags;
