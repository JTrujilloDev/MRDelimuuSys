import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  Check,
  ChefHat,
  CircleAlert,
  MessageSquareText,
  Minus,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import numeral from "numeral";
import {
  updateKitchenTicketStatus,
  type KitchenTicket,
} from "../../../shared/kitchen/kitchenTickets.store";

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
  kitchenInstructions: string;
  onKitchenInstructionsChange: (instructions: string) => void;
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
  kitchenInstructions,
  onKitchenInstructionsChange,
  kitchenTickets,
}: OrderPanelProps) => {
  const [isKitchenModalOpen, setIsKitchenModalOpen] = useState(false);
  const [isCheckoutWarningOpen, setIsCheckoutWarningOpen] = useState(false);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const sortedItems = [...items].sort((first, second) =>
    first.productName.localeCompare(second.productName, "es"),
  );
  const kitchenItems = items.filter(
    (item) => item.productVariant?.requirePreparation !== false,
  );
  const kitchenPendingUnits = kitchenItems.reduce(
    (pending, item) =>
      pending +
      Math.max(0, item.quantity - (sentToKitchen[item.id] ?? 0)),
    0,
  );
  const readyTicketCount = kitchenTickets.filter(
    (ticket) => ticket.status === "READY",
  ).length;
  const waitingTicketCount = kitchenTickets.filter(
    (ticket) => ticket.status === "PENDING",
  ).length;
  const preparingTicketCount = kitchenTickets.filter(
    (ticket) => ticket.status === "PREPARING",
  ).length;
  const pendingAdjustments = kitchenTickets.flatMap((ticket) =>
    ticket.adjustments.filter((adjustment) => adjustment.status === "PENDING"),
  );
  const pendingAdjustmentItemIds = new Set(
    pendingAdjustments.map((adjustment) => adjustment.accountItemId),
  );
  const hasKitchenCheckoutWarnings =
    kitchenPendingUnits > 0 ||
    kitchenTickets.length > 0 ||
    pendingAdjustments.length > 0;

  const requestCharge = () => {
    if (hasKitchenCheckoutWarnings) {
      setIsCheckoutWarningOpen(true);
      return;
    }
    onCharge();
  };

  const kitchenButtonState = pendingAdjustments.length > 0
    ? {
        label: `${pendingAdjustments.length} cambio${pendingAdjustments.length === 1 ? "" : "s"} sin confirmar`,
        className: "border-danger/50 bg-danger/15 text-danger",
        icon: <CircleAlert className="h-5 w-5" />,
      }
    : readyTicketCount > 0
    ? {
        label: `${readyTicketCount} listo${readyTicketCount === 1 ? "" : "s"} para recoger`,
        className: "border-success/50 bg-success/15 text-success",
        icon: <Check className="h-5 w-5" />,
      }
    : kitchenPendingUnits > 0
      ? {
          label: `Comanda · ${kitchenPendingUnits} pendiente${kitchenPendingUnits === 1 ? "" : "s"}`,
          className: "border-warning/50 bg-warning/15 text-warning",
          icon: <ChefHat className="h-5 w-5" />,
        }
      : {
          label: kitchenTickets.length > 0 ? "Comanda al día" : "Comanda",
          className: "border-white/10 bg-white/5 text-pos-order-fg/70",
          icon: <ChefHat className="h-5 w-5" />,
        };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-pos-order-bg text-pos-order-fg shadow-[0_24px_60px_-36px_rgba(15,10,8,0.8)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-xl font-black">{tableLabel || "Orden actual"}</h2>
            <p className="mt-1 text-xs text-pos-order-fg/55">
              {items.length === 0
                ? "Agrega productos para comenzar"
                : `${items.length} producto${items.length === 1 ? "" : "s"} diferente${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {items.length > 0 && (
            <span className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black">
              {items.reduce((units, item) => units + item.quantity, 0)} unid.
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 text-center">
              <Plus className="mb-3 h-8 w-8 text-pos-order-fg/30" />
              <p className="text-sm font-semibold text-pos-order-fg/50">
                Aún no hay productos en la cuenta
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedItems.map((item) => {
                const [productName, ...variantParts] = item.productName.split(" - ");
                const variantName = variantParts.join(" - ");
                const sentQuantity = sentToKitchen[item.id] ?? 0;
                const requiresPreparation =
                  item.productVariant?.requirePreparation !== false;
                const isPendingKitchen =
                  requiresPreparation && item.quantity > sentQuantity;
                const hasPendingAdjustment = pendingAdjustmentItemIds.has(
                  item.id,
                );

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-lg font-bold leading-tight">
                            {productName}
                          </p>
                          {requiresPreparation && (
                            <span
                              title={
                                hasPendingAdjustment
                                  ? "Cambio pendiente de confirmar por cocina"
                                  : isPendingKitchen
                                    ? "Pendiente de enviar a cocina"
                                    : "Enviado a cocina"
                              }
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                hasPendingAdjustment
                                  ? "bg-danger/20 text-danger"
                                  : isPendingKitchen
                                  ? "bg-warning/20 text-warning"
                                  : "bg-success/20 text-success"
                              }`}
                            >
                              {hasPendingAdjustment ? (
                                <CircleAlert className="h-3.5 w-3.5" />
                              ) : isPendingKitchen ? (
                                <ChefHat className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        {variantName && (
                          <p className="mt-1 truncate text-sm font-semibold text-pos-order-fg/60">
                            {variantName}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-pos-order-fg/45">
                          {numeral(item.price).format("$ 0,0")} por unidad
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Eliminar ${item.productName}`}
                        onClick={() => onRemove(item.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-pos-order-fg/35 transition hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <div className="flex items-center rounded-xl bg-white/10 p-1">
                        <button
                          type="button"
                          aria-label={`Reducir cantidad de ${item.productName}`}
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white/10 hover:text-accent"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-base font-black">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aumentar cantidad de ${item.productName}`}
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white/10 hover:text-accent"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-pos-order-fg/40">
                          Subtotal
                        </p>
                        <p className="text-lg font-black">
                          {numeral(item.price * item.quantity).format("$ 0,0")}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-white/10 bg-black/10 px-5 py-4">
          <button
            type="button"
            onClick={() => setIsKitchenModalOpen(true)}
            disabled={items.length === 0 && kitchenTickets.length === 0}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 ${kitchenButtonState.className}`}
          >
            <span className="flex items-center gap-2">
              {kitchenButtonState.icon}
              {kitchenButtonState.label}
            </span>
            <span className="text-xs opacity-70">Ver detalles</span>
          </button>

          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-pos-order-fg/45">
                Total de la cuenta
              </p>
              <p className="mt-0.5 text-2xl font-black">
                {numeral(total).format("$ 0,0")}
              </p>
            </div>
            <span className="text-xs text-pos-order-fg/40">
              {items.reduce((units, item) => units + item.quantity, 0)} unidades
            </span>
          </div>

          <button
            type="button"
            onClick={requestCharge}
            disabled={items.length === 0}
            className="w-full rounded-2xl bg-accent py-4 text-base font-black text-accent-foreground transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {items.length > 0
              ? `Cobrar ${numeral(total).format("$ 0,0")}`
              : "Agrega productos para cobrar"}
          </button>
        </div>
      </div>

      <Modal>
        <Modal.Backdrop isOpen={isKitchenModalOpen}>
          <Modal.Container placement="center" size="lg">
            <Modal.Dialog className="max-h-[calc(100dvh-3rem)] overflow-hidden rounded-[28px] bg-pos-surface">
              <Modal.CloseTrigger onClick={() => setIsKitchenModalOpen(false)} />
              <Modal.Header className="border-b border-border px-6 py-5">
                <div>
                  <Modal.Heading className="flex items-center gap-3 text-2xl font-black">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/15 text-warning">
                      <ChefHat className="h-6 w-6" />
                    </span>
                    Gestión de comanda
                  </Modal.Heading>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Indicaciones, productos pendientes y estado de cocina.
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <MessageSquareText className="h-4 w-4" /> Indicaciones para cocina
                  </span>
                  <textarea
                    value={kitchenInstructions}
                    onChange={(event) =>
                      onKitchenInstructionsChange(event.target.value)
                    }
                    maxLength={300}
                    rows={3}
                    placeholder="Ej: bajo en azúcar, para llevar…"
                    className="w-full resize-none rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-warning/60 focus:ring-2 focus:ring-warning/15"
                  />
                  <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                    {kitchenInstructions.length}/300
                  </span>
                </label>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <Send className="h-4 w-4" /> Productos de comanda
                    </h3>
                    {kitchenPendingUnits > 0 && (
                      <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-black text-warning">
                        {kitchenPendingUnits} pendientes
                      </span>
                    )}
                  </div>
                  {kitchenItems.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                      Esta cuenta no tiene productos que requieran comanda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {kitchenItems.map((item) => {
                        const sent = Math.min(
                          item.quantity,
                          sentToKitchen[item.id] ?? 0,
                        );
                        const pending = Math.max(0, item.quantity - sent);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold text-foreground">
                                {item.productName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {sent} enviadas · {pending} pendientes
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                                pending > 0
                                  ? "bg-warning/15 text-warning"
                                  : "bg-success/15 text-success"
                              }`}
                            >
                              {item.quantity} unid.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {kitchenTickets.length > 0 && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <CircleAlert className="h-4 w-4" /> Estado en cocina
                    </h3>
                    <div className="space-y-2">
                      {kitchenTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
                        >
                          <div>
                            <p className="font-bold text-foreground">
                              Comanda #{ticket.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.items.reduce(
                                (units, item) => units + item.quantity,
                                0,
                              )} unidades
                            </p>
                          </div>
                          {ticket.status === "READY" ? (
                            <Button
                              size="sm"
                              onPress={() =>
                                updateKitchenTicketStatus(
                                  ticket.id,
                                  "DELIVERED",
                                )
                              }
                              className="bg-success text-success-foreground"
                            >
                              <Check className="h-4 w-4" /> Recogido
                            </Button>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-black ${
                                ticket.status === "PREPARING"
                                  ? "bg-warning/15 text-warning"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {ticket.status === "PREPARING"
                                ? "En preparación"
                                : "En espera"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </Modal.Body>

              <Modal.Footer className="flex-col gap-2 border-t border-border bg-secondary/20 px-6 py-4 sm:flex-row">
                <Button
                  variant="ghost"
                  onPress={() => setIsKitchenModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Volver a la cuenta
                </Button>
                <Button
                  onPress={() => {
                    onSendToKitchen();
                    setIsKitchenModalOpen(false);
                  }}
                  isDisabled={kitchenPendingUnits === 0}
                  className="w-full bg-warning text-warning-foreground sm:flex-1"
                >
                  {kitchenPendingUnits > 0 ? (
                    <Send className="h-5 w-5" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {kitchenPendingUnits > 0
                    ? `Enviar ${kitchenPendingUnits} a cocina`
                    : "Todo enviado a cocina"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop isOpen={isCheckoutWarningOpen} isDismissable={false}>
          <Modal.Container placement="center" size="md">
            <Modal.Dialog className="overflow-hidden rounded-[28px] border border-warning/40 bg-pos-surface shadow-2xl">
              <Modal.Header className="border-b border-border bg-warning/10 px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning/20 text-warning">
                    <CircleAlert className="h-6 w-6" />
                  </span>
                  <div>
                    <Modal.Heading className="text-xl font-black">
                      Revisar antes de cobrar
                    </Modal.Heading>
                    <p className="mt-1 text-sm text-muted-foreground">
                      La cuenta todavía tiene actividad relacionada con cocina.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-3 px-6 py-5">
                {pendingAdjustments.length > 0 && (
                  <CheckoutWarning
                    tone="danger"
                    title={`${pendingAdjustments.length} cancelación${pendingAdjustments.length === 1 ? "" : "es"} sin confirmar`}
                    description="Cocina debe reconocer los cambios antes de cerrar la cuenta. Esta verificación no se puede omitir."
                  />
                )}
                {kitchenPendingUnits > 0 && (
                  <CheckoutWarning
                    tone="warning"
                    title={`${kitchenPendingUnits} unidad${kitchenPendingUnits === 1 ? "" : "es"} sin enviar`}
                    description="Estos productos aún no aparecen como una nueva comanda en cocina."
                  />
                )}
                {(waitingTicketCount > 0 || preparingTicketCount > 0) && (
                  <CheckoutWarning
                    tone="warning"
                    title="Hay comandas en proceso"
                    description={`${waitingTicketCount} en espera · ${preparingTicketCount} en preparación`}
                  />
                )}
                {readyTicketCount > 0 && (
                  <CheckoutWarning
                    tone="success"
                    title={`${readyTicketCount} comanda${readyTicketCount === 1 ? "" : "s"} lista${readyTicketCount === 1 ? "" : "s"}`}
                    description="Todavía no se ha marcado como recogida."
                  />
                )}
              </Modal.Body>

              <Modal.Footer className="flex-col gap-2 border-t border-border bg-secondary/20 px-6 py-4 sm:flex-row">
                <Button
                  variant="ghost"
                  onPress={() => {
                    setIsCheckoutWarningOpen(false);
                    setIsKitchenModalOpen(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  Revisar comanda
                </Button>
                {pendingAdjustments.length > 0 ? (
                  <Button
                    onPress={() => setIsCheckoutWarningOpen(false)}
                    className="w-full bg-danger text-danger-foreground sm:flex-1"
                  >
                    Esperar confirmación de cocina
                  </Button>
                ) : (
                  <Button
                    onPress={() => {
                      setIsCheckoutWarningOpen(false);
                      onCharge();
                    }}
                    className="w-full bg-warning text-warning-foreground sm:flex-1"
                  >
                    Continuar al cobro
                  </Button>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};

const CheckoutWarning = ({
  tone,
  title,
  description,
}: {
  tone: "danger" | "warning" | "success";
  title: string;
  description: string;
}) => {
  const toneClassName = {
    danger: "border-danger/30 bg-danger/10 text-danger",
    warning: "border-warning/30 bg-warning/10 text-warning",
    success: "border-success/30 bg-success/10 text-success",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClassName}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-foreground/70">{description}</p>
    </div>
  );
};

export default OrderPanel;
