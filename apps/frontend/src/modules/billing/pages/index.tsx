import { Button, toast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getBillingDocuments, sendBillingDocument, type BillingStatus } from "../billing.service";

const money = (value: number | string) => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
}).format(Number(value));

const dateTime = (value: string | null) => value
  ? dayjs(value).format("DD/MM/YYYY · HH:mm")
  : "—";

const statusMeta: Record<BillingStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente de envío", className: "bg-warning/15 text-warning-foreground" },
  SENDING: { label: "Enviando", className: "bg-primary/10 text-primary" },
  PROCESSING: { label: "En proceso", className: "bg-primary/10 text-primary" },
  ACCEPTED: { label: "Aceptada por DIAN", className: "bg-success/15 text-success" },
  REJECTED: { label: "Rechazada", className: "bg-destructive/10 text-danger" },
  REQUIRES_RECONCILIATION: { label: "Requiere revisión", className: "bg-warning/15 text-warning-foreground" },
  CANCELLED: { label: "Anulada", className: "bg-secondary text-muted-foreground" },
};

const paymentLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  QR: "QR",
  CREDIT: "Crédito",
};

const errorMessage = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data?.message ?? "No fue posible enviar el documento"
  : error instanceof Error ? error.message : "No fue posible enviar el documento";

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState("");
  const [search, setSearch] = useState("");
  const documentsQuery = useQuery({
    queryKey: ["billing-documents", status, storeId, search],
    queryFn: () => getBillingDocuments({
      ...(status ? { status } : {}),
      ...(storeId ? { storeId } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
  });
  const sendMutation = useMutation({
    mutationFn: sendBillingDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      toast("Documento procesado", { variant: "success", description: "Se actualizó la respuesta del proveedor." });
    },
    onError: (error) => toast("No fue posible procesar el documento", {
      variant: "danger",
      description: errorMessage(error),
    }),
  });
  const documents = useMemo(() => documentsQuery.data?.documents ?? [], [documentsQuery.data?.documents]);
  const configuredStores = (documentsQuery.data?.stores ?? []).filter((store) => store.fiscalIssuer?.isActive);
  const counts = useMemo(() => ({
    pending: documents.filter((document) => document.status === "PENDING").length,
    errors: documents.filter((document) => ["REJECTED", "REQUIRES_RECONCILIATION"].includes(document.status)).length,
    accepted: documents.filter((document) => document.status === "ACCEPTED").length,
  }), [documents]);

  return (
    <main className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Control fiscal</p>
            <h1 className="mt-1 text-3xl font-black text-foreground">Facturación electrónica</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Revisa qué documentos están pendientes y decide cuándo enviarlos a la DIAN. Las ventas con tarjeta se envían automáticamente.
            </p>
          </div>
          <Button variant="secondary" onPress={() => void documentsQuery.refetch()} isDisabled={documentsQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 ${documentsQuery.isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </header>

        {documentsQuery.data && configuredStores.length === 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
            <div><p className="font-black">No hay sedes con emisor fiscal configurado</p><p className="mt-1 text-muted-foreground">Las ventas seguirán cerrando normalmente, pero no generarán documentos hasta asociar el emisor y el proveedor.</p></div>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <Summary icon={Clock3} label="Pendientes" value={counts.pending} tone="warning" />
          <Summary icon={AlertTriangle} label="Con novedad" value={counts.errors} tone="danger" />
          <Summary icon={CheckCircle2} label="Aceptadas" value={counts.accepted} tone="success" />
        </section>

        <section className="rounded-2xl border border-border bg-pos-surface p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_210px_210px]">
            <label className="relative">
              <span className="sr-only">Buscar documento</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cuenta, referencia o número…" />
            </label>
            <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(statusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
              <option value="">Todos los puntos</option>
              {(documentsQuery.data?.stores ?? []).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>
        </section>

        <section className="space-y-3">
          {documentsQuery.isLoading ? (
            <div className="rounded-2xl border border-border bg-pos-surface p-10 text-center text-sm text-muted-foreground">Consultando documentos…</div>
          ) : documentsQuery.isError ? (
            <div className="rounded-2xl border border-danger/25 bg-danger/5 p-8 text-center text-sm text-danger">No fue posible cargar la facturación.</div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-pos-surface p-12 text-center"><FileCheck2 className="mx-auto h-9 w-9 text-muted-foreground" /><p className="mt-3 font-black">No hay documentos para mostrar</p><p className="mt-1 text-sm text-muted-foreground">Los documentos aparecerán aquí después de cerrar ventas en una sede configurada.</p></div>
          ) : documents.map((document) => {
            const meta = statusMeta[document.status];
            const retryable = ["PENDING", "REJECTED", "REQUIRES_RECONCILIATION", "PROCESSING"].includes(document.status);
            const customer = document.account?.customerSnapshot;
            const customerName = customer && typeof customer.name === "string" ? customer.name : "Consumidor final";
            return (
              <details key={document.id} className="group overflow-hidden rounded-2xl border border-border bg-pos-surface shadow-sm">
                <summary className="grid cursor-pointer list-none items-center gap-4 p-4 md:grid-cols-[minmax(240px,1fr)_150px_150px_170px_auto]">
                  <div className="min-w-0"><p className="truncate font-black text-foreground">{document.providerNumber ?? document.referenceCode}</p><p className="mt-1 truncate text-xs text-muted-foreground">{document.store.name} · Cuenta #{document.account?.id ?? "—"} · {document.account?.name ?? "Sin cuenta"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cliente</p><p className="truncate text-sm font-semibold">{customerName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Total</p><p className="font-black">{money(document.total)}</p></div>
                  <div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span><p className="mt-1 text-xs text-muted-foreground">{dateTime(document.createdAt)}</p></div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-border bg-secondary/20 p-4">
                  <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr_auto]">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <Detail label="Emisor" value={document.issuer.tradeName ?? document.issuer.legalName} />
                      <Detail label="Proveedor" value={`${document.providerConfiguration.provider} · ${document.providerConfiguration.environment}`} />
                      <Detail label="Medio de pago" value={paymentLabels[document.account?.paymentMethod ?? ""] ?? "—"} />
                      <Detail label="Aceptación" value={dateTime(document.acceptedAt)} />
                      <Detail label="Subtotal" value={money(document.subtotal)} />
                      <Detail label="Impuestos" value={money(document.taxTotal)} />
                      <Detail label="Descuentos" value={money(document.discountTotal)} />
                      <Detail label="CUFE" value={document.fiscalIdentifier ?? "Pendiente"} wide />
                    </dl>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Intentos de envío</p>
                      {document.attempts.length ? <div className="mt-2 space-y-2">{document.attempts.map((attempt) => <div key={attempt.id} className="rounded-xl border border-border bg-background p-3 text-xs"><div className="flex justify-between gap-3"><strong>Intento #{attempt.attemptNumber} · {attempt.outcome}</strong><span className="text-muted-foreground">{dateTime(attempt.startedAt)}</span></div>{attempt.providerMessage && <p className="mt-1 text-danger">{attempt.providerMessage}</p>}</div>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Todavía no se ha enviado.</p>}
                      {document.lastErrorMessage && <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-danger"><strong>{document.lastErrorCode ?? "Novedad del proveedor"}</strong><p className="mt-1">{document.lastErrorMessage}</p></div>}
                    </div>
                    <div className="flex items-start justify-end">
                      {retryable && <Button variant="primary" isPending={sendMutation.isPending && sendMutation.variables === document.id} isDisabled={sendMutation.isPending} onPress={() => sendMutation.mutate(document.id)}><Send className="h-4 w-4" />{document.status === "PENDING" ? "Enviar a DIAN" : "Reintentar"}</Button>}
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Summary({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: number; tone: "warning" | "danger" | "success" }) {
  const styles = { warning: "bg-warning/10 text-warning-foreground", danger: "bg-destructive/10 text-danger", success: "bg-success/10 text-success" }[tone];
  return <div className="flex items-center gap-4 rounded-2xl border border-border bg-pos-surface p-4 shadow-sm"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="text-2xl font-black text-foreground">{value}</p></div></div>;
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "col-span-2" : ""}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 break-all font-semibold text-foreground">{value}</dd></div>;
}
