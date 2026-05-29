import { useState, useMemo } from "react";
import { Button, Input, Label } from "@heroui/react";
import { BsArrowLeft, BsBank, BsQrCode } from "react-icons/bs";
import { FiFileText, FiTag } from "react-icons/fi";
import { BiCreditCard } from "react-icons/bi";
import type { OrderItem } from "./OrderPanel";
import numeral from "numeral";
import { Printer } from "lucide-react";
import dayjs from "dayjs";

export interface OrderInfo {
  clientName: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  date: string;
  items: OrderItem[];
  total: number;
}

export interface PrinterCommand {
  type: string;
  format: string;
  flavor: string;
  data: string;
}
export interface CloseAccountParams {
  accountId: number;
  paymentMethod: string;
  cashRegisterId: number;
  order: OrderInfo | PrinterCommand;
  printTicket: boolean;
}
interface CheckoutViewProps {
  items: OrderItem[];
  tableLabel: string;
  onConfirm: (params: CloseAccountParams) => void;
  onBack: () => void;
  accountInfo: {
    accountId: number;
    cashRegisterId: number;
  };
}

const CheckoutView = ({
  items,
  tableLabel,
  onConfirm,
  onBack,
  accountInfo,
}: CheckoutViewProps) => {
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [printTicket, setPrintTicket] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const cashValue = parseFloat(cashReceived) || 0;
  const change = Math.max(0, cashValue - total);

  const suggestedBills = useMemo(() => {
    if (!total || isNaN(total) || total <= 0) return [];

    const largeBills = [100000, 50000, 20000, 10000]; // 👈 sin 2k ni 5k
    const suggestions = new Set<number>();

    const target = Math.ceil(total);

    // 1. Exacto (solo si es múltiplo de 10k o 20k)
    if (target % 10000 === 0) {
      suggestions.add(target);
    }

    // 2. Un solo billete
    largeBills.forEach((bill) => {
      if (bill >= target) {
        suggestions.add(bill);
      }
    });

    // 3. Combinaciones de 2 billetes (solo grandes)
    for (let i = 0; i < largeBills.length; i++) {
      for (let j = i; j < largeBills.length; j++) {
        const sum = largeBills[i] + largeBills[j];
        if (sum >= target) {
          suggestions.add(sum);
        }
      }
    }

    // 4. Combinaciones de 3 billetes (muy limitadas)
    for (let i = 0; i < largeBills.length; i++) {
      for (let j = i; j < largeBills.length; j++) {
        for (let k = j; k < largeBills.length; k++) {
          const sum = largeBills[i] + largeBills[j] + largeBills[k];

          // 👇 evitar valores absurdos
          if (sum >= target && sum <= target + 30000) {
            suggestions.add(sum);
          }
        }
      }
    }

    // 5. Ordenar y limitar
    return Array.from(suggestions)
      .sort((a, b) => a - b)
      .slice(0, 4);
  }, [total]);

  const canConfirm =
    items.length > 0 &&
    (paymentMethod === "CARD" ||
      (paymentMethod === "CASH" && cashValue >= total) ||
      (paymentMethod === "QR" && qrGenerated));
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/70 bg-pos-surface/80 px-6 py-4 backdrop-blur">
        <Button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <BsArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Cerrar Cuenta</h1>
          <p className="text-xs text-muted-foreground">{tableLabel}</p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden lg:flex-row">
        {/* Left — Order summary + discount */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border border-border/70 bg-pos-surface/40 p-6 lg:p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Resumen de cuenta
          </h2>

          {/* Items list */}
          <div className="space-y-3 bg-background/80 p-4 shadow-sm mb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="min-w-0 truncate text-foreground">
                  {item.quantity}x {item.productName}
                </span>
                <span className="font-medium text-foreground">
                  {numeral(item.price * item.quantity).format("$ 0,0")}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-3 bg-background/70 p-4 mb-6 border border-border/70">
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-500">
                <span>Descuento</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-4 text-lg font-bold text-foreground">
              <span>Total</span>
              <span>{numeral(total).format("$ 0,0")}</span>
            </div>
          </div>

          {/* Discount fields */}
          <div className="space-y-4 bg-secondary/60 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <FiTag className="h-4 w-4 text-primary" />
              Descuento
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="discount" className="text-xs">
                  Monto de descuento
                </Label>
                <Input
                  id="discount"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="discount-reason"
                  className="text-xs flex items-center gap-1.5"
                >
                  <FiFileText className="h-3 w-3" />
                  Motivo del descuento
                </Label>
                <Input
                  id="discount-reason"
                  type="text"
                  placeholder="Ej: Cliente frecuente, promoción..."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Payment method */}
        <div className="flex w-full max-w-105 shrink-0 flex-col overflow-y-auto border border-border/70 bg-pos-surface/40 p-6 lg:p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Método de pago
          </h2>

          {/* Payment method tabs */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { key: "CASH" as const, icon: BsBank, label: "Efectivo" },
              { key: "CARD" as const, icon: BiCreditCard, label: "Tarjeta" },
              { key: "QR" as const, icon: BsQrCode, label: "QR" },
            ].map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                type="button"
                onClick={() => {
                  setPaymentMethod(key);
                  setCashReceived("");
                  setQrGenerated(false);
                }}
                className={`w-full flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl border p-4 text-sm font-semibold transition-all duration-200 ${
                  paymentMethod === key
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:bg-background/90"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Button>
            ))}
          </div>

          {/* Cash options */}
          {paymentMethod === "CASH" && (
            <div className="space-y-5">
              <div className="space-y-2 flex flex-col">
                <Label className="text-xs">Monto recibido</Label>
                <Input
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>

              {/* Suggested bills */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground block">
                  Billetes sugeridos
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {suggestedBills.map((bill) => (
                    <Button
                      key={bill}
                      type="button"
                      onClick={() => setCashReceived(String(bill))}
                      className={`w-full rounded-2xl border-2 py-3 text-sm font-semibold transition-all ${
                        cashValue === bill
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 text-foreground hover:border-primary/30"
                      }`}
                    >
                      {numeral(bill).format("$ 0,0")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Change */}
              <div className="rounded-[20px] bg-secondary/60 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Cambio a devolver
                </p>
                <p
                  className={`text-3xl font-bold ${cashValue >= total ? "text-green-500" : "text-destructive"}`}
                >
                  {numeral(change).format("$ 0,0")}
                </p>
                {cashValue > 0 && cashValue < total && (
                  <p className="text-xs text-destructive mt-1">
                    Monto insuficiente
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Card — nothing extra */}
          {paymentMethod === "CARD" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BiCreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Procesar pago con terminal</p>
              </div>
            </div>
          )}

          {/* QR */}
          {paymentMethod === "QR" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {qrGenerated ? (
                <div className="flex flex-col items-center gap-3 border border-border/70 bg-background/70 p-6">
                  <div className="h-40 w-40 rounded-2xl bg-secondary border-2 border-border flex items-center justify-center">
                    <BsQrCode className="h-20 w-20 text-foreground/20" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    QR generado — esperando pago
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => setQrGenerated(true)}
                  variant="outline"
                  size="lg"
                  className="gap-2 px-6 py-4"
                >
                  <BsQrCode className="h-5 w-5" />
                  Generar QR
                </Button>
              )}
            </div>
          )}

          {/* Confirm button pinned at bottom */}
          <div className="mt-auto pt-6">
            <Button
              onClick={() => setPrintTicket(() => !printTicket)}
              className={`w-full py-6 text-base font-bold ${printTicket ? "text-green-500 bg-green-500/10" : "text-muted-foreground"}`}
              size="lg"
              variant={printTicket ? "secondary" : "outline"}
            >
              <Printer className="h-5 w-5" />
              Imprimir recibo al confirmar
            </Button>
          </div>
          <div className=" pt-6">
            <Button
              onClick={() => setConfirmOpen(true)}
              isDisabled={!canConfirm}
              className="w-full py-6 text-base font-bold"
              size="lg"
            >
              Confirmar Pago — {numeral(total).format("$ 0,0")}
            </Button>
          </div>
        </div>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Confirmar cierre de cuenta
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Método</span>
                <span>{paymentMethod}</span>
              </div>

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{numeral(total).format("$ 0,0")}</span>
              </div>

              {paymentMethod === "CASH" && (
                <>
                  <div className="flex justify-between">
                    <span>Recibido</span>
                    <span>{numeral(cashValue).format("$ 0,0")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Cambio</span>
                    <span>{numeral(change).format("$ 0,0")}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                className="w-full"
                onClick={() => {
                  setConfirmOpen(false);
                  onConfirm({
                    accountId: accountInfo.accountId,
                    paymentMethod,
                    cashRegisterId: accountInfo.cashRegisterId,
                    order: {
                      clientName: "",
                      idType: "",
                      idNumber: "",
                      email: "",
                      phone: "",
                      date: dayjs().format("DD/MM/YYYY HH:mm"),
                      items,
                      total,
                    },
                    printTicket,
                  });
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutView;
