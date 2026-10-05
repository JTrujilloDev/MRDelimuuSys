import { useState, useMemo, useEffect } from "react";
import { Button, Input, Label } from "@heroui/react";
import { BsArrowLeft, BsBank, BsQrCode } from "react-icons/bs";
import { BiCreditCard } from "react-icons/bi";
import { FiFileText, FiTag } from "react-icons/fi";
import type { OrderItem } from "./OrderPanel";
import numeral from "numeral";
import { CheckCircle2, LoaderCircle, Printer, UserRound } from "lucide-react";
import dayjs from "dayjs";
import { useSocket } from "../../../shared/socket/useSocket";
import { findCustomerByIdentification, type FiscalCustomer } from "../services/customer.service";

export interface OrderInfo {
  clientName: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountObservation: string;
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
  discount: number;
  discountObservation: string;
  order: OrderInfo | PrinterCommand;
  creditCustomer?: { name: string; phone: string };
  customer?: FiscalCustomer;
  printTicket: boolean;
}
interface CheckoutViewProps {
  items: OrderItem[];
  tableLabel: string;
  onConfirm: (params: CloseAccountParams) => void;
  onBack: () => void;
  isProcessing: boolean;
  accountInfo: {
    accountId: number;
    cashRegisterId: number;
    terminalId: number;
  };
}

const CheckoutView = ({
  items,
  tableLabel,
  onConfirm,
  onBack,
  isProcessing,
  accountInfo,
}: CheckoutViewProps) => {
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [creditName, setCreditName] = useState("");
  const [creditPhone, setCreditPhone] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [printTicket, setPrintTicket] = useState(false);
  const [customerEnabled, setCustomerEnabled] = useState(false);
  const [customerLookup, setCustomerLookup] = useState<"IDLE" | "SEARCHING" | "FOUND" | "NEW" | "ERROR">("IDLE");
  const [customerForm, setCustomerForm] = useState<FiscalCustomer>({
    identificationType: "CC",
    identification: "",
    organizationType: "NATURAL_PERSON",
    name: "",
    phone: "",
    email: "",
    address: "",
    countryCode: "CO",
    tributeCode: "ZZ",
    responsibilities: ["R-99-PN"],
  });
  const socket = useSocket();
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );
  const parsedDiscount = discount.trim() ? Number(discount) : 0;
  const discountAmount = Number.isFinite(parsedDiscount) ? parsedDiscount : 0;
  const discountIsValid =
    Number.isFinite(parsedDiscount) && parsedDiscount >= 0 && parsedDiscount <= subtotal;
  const discountHasReason = discountAmount === 0 || Boolean(discountReason.trim());
  const total = discountIsValid ? subtotal - discountAmount : subtotal;

  const cashValue = parseFloat(cashReceived) || 0;
  const change = Math.max(0, cashValue - total);
  const normalizedIdentification = customerForm.identification.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  const customerEmailIsValid = !customerForm.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email);
  const customerIsValid = !customerEnabled || (
    normalizedIdentification.length >= 3 &&
    customerForm.name.trim().length >= 2 &&
    customerEmailIsValid
  );
  const effectiveCreditName = customerEnabled ? customerForm.name : creditName;
  const effectiveCreditPhone = customerEnabled ? customerForm.phone ?? "" : creditPhone;

  useEffect(() => {
    if (!customerEnabled || normalizedIdentification.length < 3) {
      setCustomerLookup("IDLE");
      return;
    }
    let cancelled = false;
    setCustomerLookup("SEARCHING");
    const timeout = window.setTimeout(async () => {
      try {
        const customer = await findCustomerByIdentification(customerForm.identificationType, normalizedIdentification);
        if (cancelled) return;
        setCustomerForm({
          ...customer,
          verificationDigit: customer.verificationDigit ?? "",
          tradeName: customer.tradeName ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          countryCode: customer.countryCode ?? "CO",
          municipalityCode: customer.municipalityCode ?? "",
          tributeCode: customer.tributeCode ?? "ZZ",
          responsibilities: customer.responsibilities?.length ? customer.responsibilities : ["R-99-PN"],
        });
        setCustomerLookup("FOUND");
      } catch (error: any) {
        if (cancelled) return;
        setCustomerLookup(error?.response?.status === 404 ? "NEW" : "ERROR");
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [customerEnabled, customerForm.identificationType, normalizedIdentification]);

  const suggestedCashAmounts = useMemo(() => {
    if (!total || isNaN(total) || total <= 0) return [];

    const roundingSteps = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    const suggestions = new Set<number>();

    suggestions.add(total);
    roundingSteps.forEach((step) => {
      suggestions.add(Math.ceil(total / step) * step);
    });

    return Array.from(suggestions)
      .filter((amount) => amount >= total)
      .sort((a, b) => a - b)
      .slice(0, 6);
  }, [total]);

  const canConfirm =
    items.length > 0 &&
    discountIsValid &&
    discountHasReason &&
    customerIsValid &&
    ((paymentMethod === "CREDIT" && effectiveCreditName.trim().length >= 2 && effectiveCreditPhone.trim().length >= 5) || paymentMethod === "CARD" ||
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
          isDisabled={isProcessing}
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
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{numeral(subtotal).format("$ 0,0")}</span>
            </div>
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
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                {!discountIsValid && (
                  <p className="text-xs text-destructive">
                    El descuento debe estar entre $0 y el subtotal de la cuenta.
                  </p>
                )}
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
                {!discountHasReason && (
                  <p className="text-xs text-destructive">
                    Debes justificar el descuento antes de cobrar.
                  </p>
                )}
              </div>
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-background/75">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-secondary/40"
              onClick={() => setCustomerEnabled(value => !value)}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
                <span><span className="block font-bold text-foreground">Datos del cliente</span><span className="block text-xs text-muted-foreground">Opcional para factura y futuras compras</span></span>
              </span>
              <span className={`relative h-6 w-11 rounded-full transition-colors ${customerEnabled ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${customerEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </span>
            </button>

            {customerEnabled && <div className="space-y-4 border-t border-border/70 p-4">
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-id-type" className="text-xs">Tipo de identificación</Label>
                  <select
                    id="customer-id-type"
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                    value={customerForm.identificationType}
                    onChange={event => {
                      const identificationType = event.target.value as FiscalCustomer["identificationType"];
                      setCustomerForm(current => ({
                        ...current,
                        identificationType,
                        identification: "",
                        organizationType: identificationType === "NIT" ? "LEGAL_ENTITY" : "NATURAL_PERSON",
                        verificationDigit: "",
                        name: "",
                        tradeName: "",
                        phone: "",
                        email: "",
                        address: "",
                        municipalityCode: "",
                      }));
                    }}
                  >
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customer-identification" className="text-xs">{customerForm.identificationType === "NIT" ? "NIT sin dígito de verificación" : "Número"}</Label>
                  <div className="relative">
                    <Input
                      id="customer-identification"
                      autoComplete="off"
                      maxLength={35}
                      value={customerForm.identification}
                      onChange={event => setCustomerForm(current => ({
                        ...current,
                        id: undefined,
                        identification: event.target.value,
                        verificationDigit: "",
                        name: "",
                        tradeName: "",
                        phone: "",
                        email: "",
                        address: "",
                        municipalityCode: "",
                      }))}
                      placeholder="Escribe para buscar"
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {customerLookup === "SEARCHING" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : customerLookup === "FOUND" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                    </span>
                  </div>
                </div>
              </div>

              {customerLookup === "FOUND" && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">Cliente encontrado. Puedes actualizar sus datos antes de cobrar.</p>}
              {customerLookup === "NEW" && <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-foreground">Cliente nuevo. Se guardará al confirmar la venta.</p>}
              {customerLookup === "ERROR" && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">No fue posible consultar la base de clientes.</p>}

              {normalizedIdentification.length >= 3 && <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="customer-name" className="text-xs">Nombre completo o razón social</Label><Input id="customer-name" maxLength={160} value={customerForm.name} onChange={event => setCustomerForm(current => ({ ...current, name: event.target.value }))} /></div>
                  {customerForm.identificationType === "NIT" && <div className="flex flex-col gap-2"><Label htmlFor="customer-dv" className="text-xs">Dígito de verificación</Label><Input id="customer-dv" inputMode="numeric" maxLength={1} value={customerForm.verificationDigit ?? ""} onChange={event => setCustomerForm(current => ({ ...current, verificationDigit: event.target.value.replace(/\D/g, "") }))} /></div>}
                  <div className="flex flex-col gap-2"><Label htmlFor="customer-organization" className="text-xs">Tipo de persona</Label><select id="customer-organization" className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" value={customerForm.organizationType} onChange={event => setCustomerForm(current => ({ ...current, organizationType: event.target.value as FiscalCustomer["organizationType"] }))}><option value="NATURAL_PERSON">Persona natural</option><option value="LEGAL_ENTITY">Persona jurídica</option></select></div>
                  <div className="flex flex-col gap-2"><Label htmlFor="customer-email" className="text-xs">Correo</Label><Input id="customer-email" type="email" maxLength={160} value={customerForm.email ?? ""} onChange={event => setCustomerForm(current => ({ ...current, email: event.target.value }))} />{!customerEmailIsValid && <span className="text-xs text-destructive">Correo no válido</span>}</div>
                  <div className="flex flex-col gap-2"><Label htmlFor="customer-phone" className="text-xs">Teléfono</Label><Input id="customer-phone" type="tel" maxLength={40} value={customerForm.phone ?? ""} onChange={event => setCustomerForm(current => ({ ...current, phone: event.target.value }))} /></div>
                  <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="customer-address" className="text-xs">Dirección</Label><Input id="customer-address" maxLength={200} value={customerForm.address ?? ""} onChange={event => setCustomerForm(current => ({ ...current, address: event.target.value }))} /></div>
                  <div className="flex flex-col gap-2"><Label htmlFor="customer-municipality" className="text-xs">Código DANE del municipio</Label><Input id="customer-municipality" inputMode="numeric" maxLength={5} placeholder="Ej. 11001" value={customerForm.municipalityCode ?? ""} onChange={event => setCustomerForm(current => ({ ...current, municipalityCode: event.target.value.replace(/\D/g, "") }))} /></div>
                </div>
              </>}
            </div>}
          </section>
        </div>

        {/* Right — Payment method */}
        <div className="flex w-full max-w-105 shrink-0 flex-col overflow-y-auto border border-border/70 bg-pos-surface/40 p-6 lg:p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Método de pago
          </h2>

          {/* Payment method tabs */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { key: "CASH" as const, icon: BsBank, label: "Efectivo" },
              { key: "CARD" as const, icon: BiCreditCard, label: "Tarjeta" },
              { key: "QR" as const, icon: BsQrCode, label: "QR" },
              { key: "CREDIT" as const, icon: FiFileText, label: "Crédito" },
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
          {paymentMethod === "CREDIT" && <section className="mb-5 space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <div><p className="font-bold text-foreground">Venta a crédito</p><p className="mt-1 text-sm text-muted-foreground">Se registra la venta y queda un saldo pendiente. No ingresa efectivo en este momento.</p></div>
            {customerEnabled ? <div className="rounded-xl border border-primary/20 bg-background/70 p-3"><p className="font-bold text-foreground">{customerForm.name || "Completa los datos del cliente"}</p><p className="mt-1 text-sm text-muted-foreground">{customerForm.phone || "El crédito requiere un teléfono de contacto"}</p></div> : <>
              <div className="flex flex-col gap-2"><Label htmlFor="credit-customer-name">Nombre del cliente</Label><Input id="credit-customer-name" maxLength={120} autoComplete="off" placeholder="Nombre completo" value={creditName} onChange={event => setCreditName(event.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="credit-customer-phone">Teléfono de contacto</Label><Input id="credit-customer-phone" type="tel" maxLength={40} autoComplete="off" placeholder="Número de contacto" value={creditPhone} onChange={event => setCreditPhone(event.target.value)} /></div>
            </>}
            <p className="text-xs text-muted-foreground">Los abonos se registran después desde la sección Créditos.</p>
          </section>}
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

              {/* Suggested cash amounts */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground block">
                  Montos sugeridos
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {suggestedCashAmounts.map((amount) => {
                    return (
                      <Button
                        key={amount}
                        type="button"
                        onClick={() => setCashReceived(String(amount))}
                        aria-label={`Recibir ${numeral(amount).format("$ 0,0")}`}
                        className={`w-full rounded-2xl border-2 py-3 text-sm font-semibold transition-all ${
                          cashValue === amount
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/30 text-foreground hover:border-primary/30"
                        }`}
                      >
                        {numeral(amount).format("$ 0,0")}
                      </Button>
                    );
                  })}
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
                  onClick={() => {
                    socket.emit("generate-qr", { total, terminalId: accountInfo.terminalId });
                    setQrGenerated(true)}}
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
              isDisabled={!canConfirm || isProcessing}
              className="w-full py-6 text-base font-bold"
              size="lg"
            >
              {isProcessing
                ? "Procesando pago…"
                : `Confirmar Pago — ${numeral(total).format("$ 0,0")}`}
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
                <span>{{ CASH: "Efectivo", CARD: "Tarjeta", QR: "QR", CREDIT: "Crédito" }[paymentMethod]}</span>
              </div>

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{numeral(total).format("$ 0,0")}</span>
              </div>
              {paymentMethod === "CREDIT" && <div className="rounded-xl bg-primary/10 p-3 text-foreground"><p className="font-bold">{effectiveCreditName.trim()}</p><p>{effectiveCreditPhone.trim()}</p><p className="mt-1 text-xs">Este valor quedará pendiente de pago.</p></div>}
              {customerEnabled && <div className="rounded-xl border border-border bg-secondary/40 p-3 text-foreground"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p><p className="mt-1 font-bold">{customerForm.name.trim()}</p><p className="text-xs">{customerForm.identificationType} {normalizedIdentification}</p></div>}

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
                isDisabled={isProcessing}
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                className="w-full"
                isDisabled={isProcessing}
                onClick={() => {
                  setConfirmOpen(false);
                  onConfirm({
                    accountId: accountInfo.accountId,
                    paymentMethod,
                    cashRegisterId: accountInfo.cashRegisterId,
                    discount: discountAmount,
                    discountObservation: discountReason.trim(),
                    ...(paymentMethod === "CREDIT" && { creditCustomer: { name: effectiveCreditName.trim(), phone: effectiveCreditPhone.trim() } }),
                    ...(customerEnabled && { customer: { ...customerForm, identification: normalizedIdentification } }),
                    order: {
                      clientName: customerEnabled ? customerForm.name.trim() : paymentMethod === "CREDIT" ? creditName.trim() : "",
                      idType: customerEnabled ? customerForm.identificationType : "",
                      idNumber: customerEnabled ? normalizedIdentification : "",
                      email: customerEnabled ? customerForm.email ?? "" : "",
                      phone: customerEnabled ? customerForm.phone ?? "" : paymentMethod === "CREDIT" ? creditPhone.trim() : "",
                      date: dayjs().format("DD/MM/YYYY HH:mm"),
                      items,
                      subtotal,
                      discount: discountAmount,
                      discountObservation: discountReason.trim(),
                      total,
                    },
                    printTicket,
                  });
                }}
              >
                {isProcessing ? "Procesando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutView;
