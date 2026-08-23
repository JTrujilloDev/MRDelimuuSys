import { useEffect, useMemo, useState } from "react";
import { Check, ChefHat, ChevronRight, Clock3, PackageCheck, Play, ShoppingBag, Timer, UtensilsCrossed } from "lucide-react";
import { updateKitchenTicketStatus, useKitchenTickets } from "../../../shared/kitchen/kitchenTickets.store";

type KitchenStatus = "PENDING" | "PREPARING" | "READY";
type KitchenOrder = {
  id: number; accountName: string; orderNumber: number; createdAt: Date; status: KitchenStatus;
  products: { name: string; quantity: number; note?: string }[];
};

const initialOrders = [
  { id: 1, accountName: "Mesa 3", orderNumber: 41, createdAt: new Date(Date.now() - 12 * 60_000), status: "PREPARING", products: [
    { name: "Cuajada con dulce", quantity: 2, note: "Papayuela y arequipe" },
    { name: "Fresas con crema", quantity: 1, note: "Sin queso" },
  ] },
  { id: 2, accountName: "Para llevar", orderNumber: 42, createdAt: new Date(Date.now() - 8 * 60_000), status: "PENDING", products: [
    { name: "Oblea especial", quantity: 3, note: "Una sin coco" }, { name: "Arroz con leche", quantity: 2 },
  ] },
  { id: 3, accountName: "Mesa 7", orderNumber: 43, createdAt: new Date(Date.now() - 5 * 60_000), status: "PENDING", products: [{ name: "Merengón de fresa", quantity: 2 }] },
  { id: 4, accountName: "Mesa 1", orderNumber: 44, createdAt: new Date(Date.now() - 2 * 60_000), status: "PENDING", products: [{ name: "Cuajada con dulce", quantity: 1, note: "Solo mora" }] },
];
void initialOrders;

const displayStock = [{ name: "Fresas con crema", quantity: 10 }, { name: "Arroz con leche", quantity: 5 }];
const elapsedMinutes = (date: Date) => Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));

const KitchenView = () => {
  const tickets = useKitchenTickets();
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((current) => current + 1);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const orders = useMemo<KitchenOrder[]>(() => tickets
    .filter((ticket) => ticket.status !== "DELIVERED")
    .map((ticket) => ({
      id: ticket.id,
      accountName: ticket.accountName,
      orderNumber: ticket.id,
      createdAt: new Date(ticket.createdAt),
      status: ticket.status as KitchenStatus,
      products: ticket.items.map((item) => ({ name: item.productName, quantity: item.quantity, note: item.note })),
    })), [tickets]);
  const activeOrder = orders.find((order) => order.status === "PREPARING");
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "PENDING"), [orders]);
  const nextOrder = pendingOrders[0];
  const waitingOrders = pendingOrders.slice(1);

  const startOrder = (id: number) => {
    if (activeOrder) return;
    updateKitchenTicketStatus(id, "PREPARING");
  };
  const finishActiveOrder = () => {
    if (!activeOrder) return;
    updateKitchenTicketStatus(activeOrder.id, "READY");
  };

  return (
    <main className="flex h-full min-h-0 flex-col bg-background p-4 lg:p-6">
      <header className="mb-4 flex shrink-0 items-center justify-between rounded-[24px] border border-border bg-pos-surface px-5 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pos-order-bg text-pos-order-fg"><ChefHat className="h-8 w-8" /></div>
          <div><h1 className="text-3xl font-black tracking-tight text-foreground">Cocina</h1><p className="text-base text-muted-foreground">{activeOrder ? "Hay un pedido en preparación" : "Listos para iniciar el siguiente pedido"}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <Counter label="En espera" value={pendingOrders.length} className="bg-primary/10 text-primary" />
          <Counter label="Listos" value={orders.filter((order) => order.status === "READY").length} className="hidden bg-success/15 text-success sm:block" />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.55fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-primary bg-pos-surface shadow-[0_24px_60px_-35px_rgba(120,72,30,0.6)] xl:order-2">
          <div className="flex shrink-0 items-center justify-between bg-primary px-6 py-4 text-primary-foreground">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20"><UtensilsCrossed className="h-6 w-6" /></span><div><p className="text-sm font-black uppercase tracking-[0.18em]">En preparación</p><p className="text-sm opacity-85">Pedido actual</p></div></div>
            {activeOrder && <OrderTimer createdAt={activeOrder.createdAt} prominent />}
          </div>
          {activeOrder ? <>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-7 py-5">
              <div><p className="text-lg font-semibold text-muted-foreground">Pedido #{activeOrder.orderNumber}</p><h2 className="text-4xl font-black tracking-tight text-foreground lg:text-5xl">{activeOrder.accountName}</h2></div>
              <div className="rounded-2xl bg-secondary px-4 py-3 text-center"><p className="text-xs font-bold uppercase text-muted-foreground">Productos</p><p className="text-3xl font-black text-foreground">{activeOrder.products.reduce((total, product) => total + product.quantity, 0)}</p></div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-7 py-3">{activeOrder.products.map((product, index) => <ProductRow key={`${product.name}-${index}`} {...product} prominent />)}</div>
            <div className="shrink-0 border-t border-border bg-secondary/30 p-5"><button type="button" onClick={finishActiveOrder} className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-success px-6 text-xl font-black text-success-foreground shadow-sm transition-transform hover:brightness-95 active:scale-[0.99]"><Check className="h-7 w-7" /> Pedido listo</button></div>
          </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><PackageCheck className="mb-4 h-20 w-20 text-success" /><h2 className="text-3xl font-black text-foreground">Sin pedido en preparación</h2><p className="mt-2 text-lg text-muted-foreground">Inicia el siguiente pedido desde el panel derecho.</p></div>}
        </section>

        <aside className="flex min-h-0 flex-col gap-4 xl:order-1">
          <section className="shrink-0 overflow-hidden rounded-[24px] border-2 border-warning bg-pos-surface shadow-sm">
            <div className="flex items-center justify-between bg-warning px-5 py-3 text-warning-foreground"><div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]"><ChevronRight className="h-5 w-5" /> Siguiente</div>{nextOrder && <OrderTimer createdAt={nextOrder.createdAt} />}</div>
            {nextOrder ? <div className="p-5">
              <div className="mb-3 flex items-start justify-between"><div><p className="font-semibold text-muted-foreground">Pedido #{nextOrder.orderNumber}</p><h2 className="text-3xl font-black text-foreground">{nextOrder.accountName}</h2></div><span className="rounded-xl bg-warning/20 px-3 py-2 text-xl font-black text-foreground">{nextOrder.products.reduce((total, product) => total + product.quantity, 0)}</span></div>
              <div className="max-h-48 overflow-y-auto border-y border-border">{nextOrder.products.map((product, index) => <ProductRow key={`${product.name}-${index}`} {...product} />)}</div>
              <button type="button" disabled={Boolean(activeOrder)} onClick={() => startOrder(nextOrder.id)} className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-pos-order-bg px-5 text-lg font-bold text-pos-order-fg disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-5 w-5 fill-current" />{activeOrder ? "Finaliza el pedido actual" : "Iniciar preparación"}</button>
            </div> : <p className="p-8 text-center text-lg text-muted-foreground">No hay pedidos pendientes.</p>}
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border bg-pos-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><h3 className="flex items-center gap-2 text-lg font-black text-foreground"><Clock3 className="h-5 w-5 text-muted-foreground" /> Cola de pedidos</h3><span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-muted-foreground">{waitingOrders.length}</span></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{waitingOrders.length ? waitingOrders.map((order, index) => <div key={order.id} className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3 last:mb-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pos-order-bg text-lg font-black text-pos-order-fg">{index + 2}</span><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold text-foreground">{order.accountName}</p><p className="text-sm text-muted-foreground">#{order.orderNumber} · {order.products.reduce((total, product) => total + product.quantity, 0)} productos</p></div><OrderTimer createdAt={order.createdAt} /></div>) : <p className="py-8 text-center text-muted-foreground">No hay más pedidos en cola.</p>}</div>
            <div className="shrink-0 border-t border-border bg-secondary/20 p-4"><p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground"><ShoppingBag className="h-4 w-4" /> En vitrina</p><div className="grid grid-cols-2 gap-2">{displayStock.map((product) => <div key={product.name} className="rounded-xl bg-pos-surface px-3 py-2"><p className="truncate text-sm font-semibold text-foreground">{product.name}</p><p className="text-sm font-black text-primary">{product.quantity} unidades</p></div>)}</div></div>
          </section>
        </aside>
      </div>
    </main>
  );
};

const Counter = ({ label, value, className }: { label: string; value: number; className: string }) => <div className={`rounded-2xl px-5 py-3 text-center ${className}`}><p className="text-xs font-bold uppercase tracking-wider">{label}</p><p className="text-3xl font-black leading-none text-foreground">{value}</p></div>;
const ProductRow = ({ name, quantity, note, prominent = false }: { name: string; quantity: number; note?: string; prominent?: boolean }) => <div className="border-b border-border py-4 last:border-b-0"><div className="flex items-start gap-4"><span className={`${prominent ? "h-14 w-14 text-3xl" : "h-11 w-11 text-2xl"} flex shrink-0 items-center justify-center rounded-xl bg-pos-order-bg font-black text-pos-order-fg`}>{quantity}</span><div className="min-w-0 flex-1"><p className={`${prominent ? "text-2xl lg:text-3xl" : "text-lg"} font-bold leading-tight text-foreground`}>{name}</p>{note && <p className={`${prominent ? "text-lg" : "text-base"} mt-2 rounded-lg border-l-4 border-warning bg-warning/15 px-3 py-2 font-bold text-foreground`}>⚠ {note}</p>}</div></div></div>;
const OrderTimer = ({ createdAt, prominent = false }: { createdAt: Date; prominent?: boolean }) => { const minutes = elapsedMinutes(createdAt); return <span className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-black ${prominent ? "bg-white/20 text-xl" : minutes >= 10 ? "bg-destructive/15 text-destructive" : "bg-background/60 text-foreground"}`}><Timer className={prominent ? "h-5 w-5" : "h-4 w-4"} />{minutes} min</span>; };

export default KitchenView;
