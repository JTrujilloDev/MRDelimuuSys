import { Check, ChefHat, Minus, Plus, Send, Trash2 } from "lucide-react";
import numeral from "numeral";
import { updateKitchenTicketStatus, type KitchenTicket } from "../../../shared/kitchen/kitchenTickets.store";

export interface OrderItem {
  id: number;
  productName: string;
  price: number;
  quantity: number;
  productVariant?: { id: number; requirePreparation: boolean };
}

interface OrderPanelProps {
  items: OrderItem[];
  onUpdateQuantity: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onCharge: () => void;
  tableLabel?: string;
  sentToKitchen: Record<number, number>;
  onSendToKitchen: () => void;
  kitchenTickets: KitchenTicket[];
}

const OrderPanel = ({
  items,
  onUpdateQuantity,
  onRemove,
  onCharge,
  tableLabel,
  sentToKitchen,
  onSendToKitchen,
  kitchenTickets,
}: OrderPanelProps) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = subtotal;
  const sortedItems = [...items].sort((a, b) => a.productName.localeCompare(b.productName));
  const kitchenPendingUnits = items.reduce((total, item) => {
    // During the prototype, missing metadata is treated as eligible so an old
    // cached account response cannot leave the kitchen action inaccessible.
    if (item.productVariant?.requirePreparation === false) return total;
    const itemKey = item.id;
    return total + Math.max(0, item.quantity - (sentToKitchen[itemKey] ?? 0));
  }, 0);
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-pos-order-bg text-pos-order-fg shadow-[0_24px_60px_-36px_rgba(15,10,8,0.8)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold">{tableLabel || "Orden actual"}</h2>
          <p className="mt-1 text-xs text-pos-order-fg/55">
            Resumen listo para cobrar
          </p>
        </div>
        
      </div>

      {/* Items */}
      <div className="h-full flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5">
            <p className="text-sm  text-pos-order-fg/45">
              Aún no hay productos en la orden
            </p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{item.productName.split(" - ")[0]}</p>
                <p className="truncate text-sm font-semibold">{item.productName.split(" - ")[1]}</p>
                <p className="mt-0.5 text-xs text-pos-order-fg/55">
                  {numeral(item.price).format("$ 0,0")}
                </p>
                {item.productVariant?.requirePreparation !== false && (
                  <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${item.quantity > (sentToKitchen[item.id] ?? 0) ? "text-warning" : "text-success"}`}>
                    {item.quantity > (sentToKitchen[item.id] ?? 0) ? <ChefHat className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    {item.quantity > (sentToKitchen[item.id] ?? 0) ? "Pendiente de enviar" : "Enviado a cocina"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl bg-white/10 px-1.5 py-1">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="rounded-lg p-1 transition-colors hover:bg-white/10 hover:text-accent"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="rounded-lg p-1 transition-colors hover:bg-white/10 hover:text-accent"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="w-16 text-right text-sm font-semibold">
                  {numeral(item.price * item.quantity).format("$ 0,0")}
                </span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="rounded-lg p-1 text-pos-order-fg/35 transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2 border-t border-white/10 px-6 py-4">
        {/* <div className="flex justify-between text-sm text-pos-order-fg/65">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-pos-order-fg/65">
          <span>Impuesto (8%)</span>
          <span>${tax.toFixed(2)}</span>
        </div> */}
        <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{numeral(total).format("$ 0,0")}</span>
        </div>
      </div>

      {/* Charge Button */}
      <div className="space-y-3 px-6 pb-6">
        {kitchenTickets.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pos-order-fg/55"><ChefHat className="h-4 w-4" /> Estado en cocina</p>
            <div className="flex flex-wrap gap-2">
              {kitchenTickets.map((ticket) => (
                <span key={ticket.id} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${ticket.status === "READY" ? "bg-success text-success-foreground" : ticket.status === "PREPARING" ? "bg-warning text-warning-foreground" : "bg-white/10 text-pos-order-fg"}`}>
                  {ticket.status === "READY" ? "Listo para recoger" : ticket.status === "PREPARING" ? "En preparación" : "En espera"}
                  {ticket.status === "READY" && <button type="button" onClick={() => updateKitchenTicketStatus(ticket.id, "DELIVERED")} className="rounded-full bg-black/15 px-2 py-0.5 hover:bg-black/25">Recogido</button>}
                </span>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onSendToKitchen}
          disabled={kitchenPendingUnits === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-warning/40 bg-warning/15 py-3.5 text-base font-bold text-warning transition-all hover:bg-warning/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-pos-order-fg/35"
        >
          {kitchenPendingUnits > 0 ? <Send className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          {kitchenPendingUnits > 0 ? `Enviar a cocina · ${kitchenPendingUnits}` : "Todo enviado a cocina"}
        </button>
        <button
          onClick={onCharge}
          disabled={items.length === 0}
          className="w-full rounded-2xl bg-accent py-4 text-base font-bold text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {items.length > 0
            ? `Cobrar ${numeral(total).format("$ 0,0")}`
            : "Agrega productos para cobrar"}
        </button>
      </div>
    </div>
  );
};

export default OrderPanel;
