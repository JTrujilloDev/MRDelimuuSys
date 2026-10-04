import { Button, Input, Label, Modal, TextArea, toast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Banknote, CheckCircle2, ChevronDown, FileText, Search, Trash2, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import axios from "axios";
import { useAuth } from "../../../app/auth/AuthProvider";
import { newRequestKey } from "../../../shared/utils/requestKey";
import { useGetOpenCashRegister } from "../../POS/hooks/cashRegister/useGetOpenCashRegister";
import { getCredits, payCredit, voidCreditPayment } from "../credits.service";

const money = (amount: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 }).format(amount);
const date = (value: string | null) => value ? new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }) : "—";
const paymentLabels: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", QR: "QR" };
const statusLabels = { PENDING: "Pendiente", PAID: "Pagado", CANCELLED: "Anulado" };

const CreditsPage = () => {
  const { state } = useAuth();
  const context = state?.activeContext;
  const storeId = context?.store.id;
  const allowed = Boolean(state?.user.isGlobalAdmin || ["ADMIN", "CASHIER"].includes(context?.role || ""));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["credits", storeId], queryFn: getCredits, enabled: Boolean(storeId && allowed) });
  const shiftQuery = useGetOpenCashRegister(context?.terminal.id || 0);
  const shift = shiftQuery.data?.data as { id: number; userId: number } | null | undefined;
  const canCollect = Boolean(shift && (state?.user.isGlobalAdmin || context?.role === "ADMIN" || shift.userId === state?.user.id));
  const credits = query.data ?? [];
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ type: "PAYMENT" | "VOID"; creditId: number; paymentId?: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [observation, setObservation] = useState("");
  const [error, setError] = useState("");
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const selected = credits.find(item => item.id === dialog?.creditId);
  const selectedPayment = selected?.payments.find(item => item.id === dialog?.paymentId);
  useEffect(() => { setDialog(null); setSearch(""); setError(""); }, [storeId]);
  const refresh = async () => { await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["credits"] }),
    queryClient.invalidateQueries({ queryKey: ["openCashRegister"] }),
    queryClient.invalidateQueries({ queryKey: ["cashRegisterHistory"] }),
  ]); };
  const onError = async (cause: unknown) => {
    const message = axios.isAxiosError(cause) ? cause.response?.data?.message || "No fue posible registrar el cambio" : "No fue posible registrar el cambio";
    setError(message); await refresh();
  };
  const payment = useMutation({ mutationFn: payCredit, onSuccess: async () => { await refresh(); setDialog(null); request.current = null; toast("Abono registrado", { variant: "success" }); }, onError });
  const cancellation = useMutation({ mutationFn: voidCreditPayment, onSuccess: async () => { await refresh(); setDialog(null); toast("Abono anulado", { variant: "success" }); }, onError });
  const busy = payment.isPending || cancellation.isPending;
  const pending = credits.filter(item => item.status === "PENDING");
  const active = credits.filter(item => item.status !== "CANCELLED");
  const visible = credits.filter(item => (filter === "ALL" || item.status === filter) && `${item.customer?.name || ""} ${item.customer?.phone || ""} ${item.name} ${item.id}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));

  if (!allowed) return <Navigate to="/app/pos" replace />;
  return <div className="h-full overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wallet className="h-7 w-7" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{context?.store.name}</p><h1 className="text-2xl font-black text-foreground">Créditos</h1><p className="mt-1 text-sm text-muted-foreground">Ventas fiadas, saldos pendientes y abonos de clientes.</p></div></div>
        <Button variant="outline" onClick={() => navigate("/app/pos")}>Nueva venta en POS <ArrowUpRight className="h-4 w-4" /></Button>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Saldo por cobrar", value: money(pending.reduce((sum, item) => sum + item.balance, 0)), icon: Wallet }, { label: "Créditos pendientes", value: String(pending.length), icon: FileText }, { label: "Abonos acumulados", value: money(active.reduce((sum, item) => sum + item.paid, 0)), icon: CheckCircle2 }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-pos-surface p-5"><div className="flex items-center justify-between text-muted-foreground"><p className="text-sm">{label}</p><Icon className="h-5 w-5" /></div><p className="mt-3 text-2xl font-black text-foreground">{query.isPending ? "—" : value}</p></div>)}
      </div>
      {!canCollect && <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-foreground">Puedes consultar los créditos. Para registrar o anular abonos, abre un turno propio en este punto o solicita apoyo de administración.</div>}
      <section className="overflow-hidden rounded-2xl border border-border bg-pos-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">{[["PENDING", "Pendientes"], ["PAID", "Pagados"], ["CANCELLED", "Anulados"], ["ALL", "Todos"]].map(([key, label]) => <Button key={key} variant={filter === key ? "primary" : "secondary"} size="sm" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</Button>)}</div>
          <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-muted-foreground" /><Input className="w-full pl-9" aria-label="Buscar crédito" placeholder="Cliente, teléfono o venta…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        </div>
        {query.isError && <div role="alert" className="p-6 text-destructive">No fue posible cargar los créditos. <Button variant="outline" onClick={() => query.refetch()}>Reintentar</Button></div>}
        {query.isPending && <p className="p-8 text-center text-muted-foreground">Cargando créditos…</p>}
        {!query.isPending && !query.isError && !visible.length && <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground"><Wallet className="h-10 w-10 opacity-50" /><p className="font-semibold">No hay créditos en esta vista</p><p className="text-sm">Las ventas con forma de pago Crédito aparecerán aquí.</p></div>}
        <div className="divide-y divide-border">{visible.map(credit => <details key={credit.id} className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-5 transition hover:bg-secondary/30">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
            <div className="min-w-40 flex-1"><p className="font-bold text-foreground">{credit.customer?.name || "Cliente sin identificar"}</p><p className="mt-1 text-xs text-muted-foreground">Venta #{credit.id} · {credit.customer?.phone || "Sin teléfono"} · {date(credit.closedAt)}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${credit.status === "PENDING" ? "bg-primary/10 text-primary" : credit.status === "PAID" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{statusLabels[credit.status]}</span>
            <div className="min-w-28 text-right"><p className="text-xs text-muted-foreground">Saldo pendiente</p><p className="font-black text-foreground">{money(credit.balance)}</p></div><ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-border bg-secondary/15 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex gap-8"><div><p className="text-xs text-muted-foreground">Valor de la venta</p><p className="font-bold">{money(credit.total)}</p></div><div><p className="text-xs text-muted-foreground">Abonado</p><p className="font-bold">{money(credit.paid)}</p></div></div>{credit.status === "PENDING" && <Button isDisabled={!canCollect || busy} onClick={() => { setDialog({ type: "PAYMENT", creditId: credit.id }); setAmount(""); setMethod("CASH"); setObservation(""); setError(""); request.current = null; }}><Banknote className="h-4 w-4" />Registrar abono</Button>}</div>
            <div className="space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historial de abonos</p>{!credit.payments.length && <p className="text-sm text-muted-foreground">Todavía no tiene abonos.</p>}{credit.payments.map(item => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-pos-surface p-3"><div><p className="text-sm font-semibold">{paymentLabels[item.paymentMethod]} · {date(item.createdAt)} {item.voidedAt && <span className="ml-2 text-destructive">Anulado</span>}</p><p className="mt-1 text-xs text-muted-foreground">{item.receivedBy || "Usuario no registrado"} · Turno #{item.cashRegisterId}</p>{item.observation && <p className="mt-1 text-xs text-muted-foreground">{item.observation}</p>}{item.voidReason && <p className="mt-1 text-xs text-destructive">{item.voidReason}</p>}</div><div className="flex items-center gap-3"><span className={`font-bold ${item.voidedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>{money(item.amount)}</span>{!item.voidedAt && canCollect && item.cashRegisterId === shift?.id && <Button size="sm" variant="outline" aria-label={`Anular abono ${item.id}`} isDisabled={busy} onClick={() => { setDialog({ type: "VOID", creditId: credit.id, paymentId: item.id }); setObservation(""); setError(""); }}><Trash2 className="h-4 w-4" />Anular</Button>}</div></div>)}</div>
          </div>
        </details>)}</div>
      </section>
      <p className="text-xs text-muted-foreground">Los abonos no son ventas nuevas. Solo los recibidos en efectivo aumentan el efectivo esperado del turno. Los abonos de turnos cerrados no se pueden anular.</p>
    </div>
    <Modal><Modal.Backdrop isOpen={Boolean(dialog && selected)}><Modal.Container size="lg"><Modal.Dialog className="max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-border bg-pos-surface text-foreground shadow-2xl">
      <Modal.Header className="shrink-0 border-b border-border bg-pos-surface px-5 py-4 text-foreground"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black text-foreground">{dialog?.type === "VOID" ? "Anular abono" : "Registrar abono"}</h2><p className="mt-1 text-sm text-muted-foreground">{selected?.customer?.name} · Venta #{selected?.id}</p></div><Button variant="ghost" className="shrink-0 text-foreground" aria-label="Cerrar formulario de abono" isDisabled={busy} onClick={() => setDialog(null)}><X className="h-5 w-5" /></Button></div></Modal.Header>
      <Modal.Body className="min-h-0 space-y-5 overflow-y-auto bg-pos-surface px-5 py-4 text-foreground">
        <div className="rounded-xl border border-border bg-secondary/40 p-4"><p className="text-sm text-muted-foreground">{dialog?.type === "VOID" ? "Abono que se anulará" : "Saldo pendiente"}</p><p className="mt-1 text-2xl font-black text-foreground">{money(dialog?.type === "VOID" ? selectedPayment?.amount || 0 : selected?.balance || 0)}</p></div>
        {dialog?.type === "PAYMENT" && <>
          <div className="flex flex-col gap-2"><Label className="text-foreground" htmlFor="credit-payment-amount">Valor del abono</Label><div className="flex items-center gap-2"><Input className="h-11 min-w-0 flex-1 border border-border bg-background text-foreground shadow-sm placeholder:text-foreground/55" id="credit-payment-amount" type="number" min="0.01" step="0.01" max={selected?.balance} placeholder="0" value={amount} onChange={event => setAmount(event.target.value)} /><Button variant="secondary" onClick={() => setAmount(String(selected?.balance || 0))}>Saldo completo</Button></div></div>
          <fieldset className="space-y-2"><legend className="text-sm font-semibold text-foreground">Medio de pago recibido</legend><div className="grid grid-cols-3 gap-2">{Object.entries(paymentLabels).map(([key, label]) => <Button key={key} variant={method === key ? "primary" : "secondary"} aria-pressed={method === key} onClick={() => setMethod(key)}>{label}</Button>)}</div></fieldset>
        </>}
        <div className="flex flex-col gap-2"><Label className="text-foreground" htmlFor="credit-payment-note">{dialog?.type === "VOID" ? "Motivo de anulación (obligatorio)" : "Observación (opcional)"}</Label><TextArea id="credit-payment-note" className="block min-h-24 w-full min-w-0 max-w-full resize-none border border-border bg-background text-foreground placeholder:text-foreground/55" rows={3} maxLength={500} value={observation} onChange={event => setObservation(event.target.value)} placeholder={dialog?.type === "VOID" ? "Explica por qué se anula este abono" : "Referencia o nota del pago"} /></div>
        {dialog?.type === "VOID" && <p className="text-sm text-muted-foreground">El saldo del cliente volverá a aumentar. Si el abono fue en efectivo, también se ajustará el efectivo esperado de este turno.</p>}
        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </Modal.Body>
      <Modal.Footer className="shrink-0 gap-2 border-t border-border bg-pos-surface px-5 py-4 text-foreground"><Button variant="secondary" isDisabled={busy} onClick={() => setDialog(null)}>Cancelar</Button><Button variant={dialog?.type === "VOID" ? "danger" : "primary"} isDisabled={busy || !canCollect || (dialog?.type === "VOID" ? !observation.trim() : !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > (selected?.balance || 0))} onClick={() => {
        if (!selected || !shift || busy) return; setError("");
        if (dialog?.type === "VOID" && selectedPayment) { cancellation.mutate({ accountId: selected.id, paymentId: selectedPayment.id, cashRegisterId: shift.id, reason: observation }); return; }
        const fingerprint = JSON.stringify([selected.id, shift.id, Number(amount), method, observation.trim()]);
        if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: newRequestKey() };
        payment.mutate({ accountId: selected.id, cashRegisterId: shift.id, amount: Number(amount), paymentMethod: method, observation: observation.trim(), requestKey: request.current.key });
      }}>{busy ? "Guardando…" : dialog?.type === "VOID" ? "Confirmar anulación" : "Guardar abono"}</Button></Modal.Footer>
    </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
  </div>;
};
export default CreditsPage;
