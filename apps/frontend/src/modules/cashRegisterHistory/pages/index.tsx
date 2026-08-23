import { Button, Chip } from "@heroui/react";
import dayjs from "dayjs";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock3,
  PackageCheck,
  ReceiptText,
  SearchX,
  Store,
  UserRound,
} from "lucide-react";
import numeral from "numeral";
import { useMemo, useState } from "react";
import { useCashRegisterHistory } from "../hooks/useCashRegisterHistory";

type SoldVariant = {
  productVariantId: number;
  productName: string;
  variantName: string;
  quantity: number;
};

type AccountItem = {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  productVariant: { id: number; name: string; product: { name: string } };
};

type Sale = {
  id: number;
  name: string;
  total: number;
  discount: number;
  paymentMethod: "CASH" | "CARD" | "QR" | "CREDIT" | null;
  closedAt: string | null;
  accountItems: AccountItem[];
};

type CashRegister = {
  id: number;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  closingAmount: number | null;
  difference: number | null;
  totalSales: number;
  totalExpenses: number;
  cashAmount: number;
  cardAmount: number;
  qrAmount: number;
  creditAmount: number;
  user: { id: number; name: string };
  terminal: { id: number; name: string };
  accounts: Sale[];
  soldVariants: SoldVariant[];
  soldVariantUnits: number;
};

const money = (value: number | null | undefined) =>
  numeral(value ?? 0).format("$ 0,0");

const longDate = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(value));

const paymentLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  QR: "QR",
  CREDIT: "Crédito",
};

const CashRegisterHistory = () => {
  const [from, setFrom] = useState(dayjs().subtract(6, "day").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const fromIso = dayjs(from).startOf("day").toISOString();
  const toIso = dayjs(to).endOf("day").toISOString();
  const invalidRange = dayjs(from).isAfter(dayjs(to), "day");
  const { data, isLoading, isError } = useCashRegisterHistory(fromIso, toIso, !invalidRange);
  const registers: CashRegister[] = invalidRange ? [] : (data?.data ?? []);

  const summary = useMemo(
    () => ({
      sales: registers.reduce((total, register) => total + register.totalSales, 0),
      tickets: registers.reduce((total, register) => total + register.accounts.length, 0),
      units: registers.reduce((total, register) => total + register.soldVariantUnits, 0),
    }),
    [registers],
  );

  const applyPreset = (days: number) => {
    setFrom(dayjs().subtract(days - 1, "day").format("YYYY-MM-DD"));
    setTo(dayjs().format("YYYY-MM-DD"));
  };

  const activePreset = [7, 30].find(
    (days) =>
      from === dayjs().subtract(days - 1, "day").format("YYYY-MM-DD") &&
      to === dayjs().format("YYYY-MM-DD"),
  );

  return (
    <main className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Reportes
            </p>
            <h1 className="text-2xl font-bold text-foreground">Historial de cajas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta las ventas y variantes vendidas en cada turno.
            </p>
          </div>
        </header>

        <section
          aria-label="Filtros del historial"
          className="rounded-2xl border border-border bg-pos-surface p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Período del reporte</h2>
                  <p className="text-xs text-muted-foreground">Selecciona un rango rápido o personalizado.</p>
                </div>
              </div>

              <div className="flex w-fit gap-1 rounded-xl bg-secondary p-1">
                {[7, 30].map((days) => (
                  <Button
                    key={days}
                    size="sm"
                    variant={activePreset === days ? "primary" : "ghost"}
                    onClick={() => applyPreset(days)}
                    className={activePreset === days ? "" : "text-foreground"}
                  >
                    Últimos {days} días
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Fecha inicial
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Fecha final
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={dayjs().format("YYYY-MM-DD")}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
            </div>
          </div>
        </section>

        {invalidRange && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            La fecha inicial no puede ser posterior a la fecha final.
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={Banknote} label="Ventas del período" value={money(summary.sales)} />
          <SummaryCard icon={ReceiptText} label="Ventas realizadas" value={String(summary.tickets)} />
          <SummaryCard icon={PackageCheck} label="Unidades vendidas" value={String(summary.units)} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Turnos encontrados</h2>
            <span className="text-sm text-muted-foreground">{registers.length} cajas</span>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border bg-pos-surface p-10 text-center text-sm text-muted-foreground">
              Consultando historial…
            </div>
          ) : isError ? (
            <EmptyState message="No fue posible cargar el historial." />
          ) : registers.length === 0 ? (
            <EmptyState message="No hay cajas registradas en este período." />
          ) : (
            registers.map((register) => <RegisterCard key={register.id} register={register} />)
          )}
        </section>
      </div>
    </main>
  );
};

const SummaryCard = ({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-border bg-pos-surface p-4 shadow-sm">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold text-foreground">{value}</p></div>
  </div>
);

const RegisterCard = ({ register }: { register: CashRegister }) => (
  <details className="group overflow-hidden rounded-2xl border border-border bg-pos-surface shadow-sm">
    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-[190px] flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold capitalize text-foreground">{longDate(register.closedAt ?? register.openedAt)}</h3>
          <Chip className={register.status === "OPEN" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}>
            {register.status === "OPEN" ? "Abierta" : "Cerrada"}
          </Chip>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{dayjs(register.openedAt).format("HH:mm")} – {register.closedAt ? dayjs(register.closedAt).format("HH:mm") : "Ahora"}</span>
          <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{register.user.name}</span>
          <span className="flex items-center gap-1"><Store className="h-3.5 w-3.5" />{register.terminal.name}</span>
        </div>
      </div>
      <Metric label="Ventas" value={money(register.totalSales)} />
      <Metric label="Facturas" value={String(register.accounts.length)} />
      <Metric label="Unidades" value={String(register.soldVariantUnits)} />
      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>

    <div className="grid gap-5 border-t border-border bg-secondary/20 p-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Resumen del turno</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Detail label="Efectivo" value={money(register.cashAmount)} />
          <Detail label="Tarjeta" value={money(register.cardAmount)} />
          <Detail label="QR" value={money(register.qrAmount)} />
          <Detail label="Crédito" value={money(register.creditAmount)} />
          <Detail label="Gastos" value={money(register.totalExpenses)} />
          <Detail label="Diferencia de caja" value={money(register.difference)} />
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Variantes vendidas</h4>
        {register.soldVariants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se vendieron productos en este turno.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {register.soldVariants.map((variant) => (
              <div key={variant.productVariantId} className="flex items-center justify-between rounded-xl border border-border bg-pos-surface px-3 py-2">
                <div><p className="text-sm font-medium text-foreground">{variant.productName}</p><p className="text-xs text-muted-foreground">{variant.variantName}</p></div>
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">{variant.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="lg:col-span-2">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Ventas del turno</h4>
        <div className="overflow-x-auto rounded-xl border border-border bg-pos-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-pos-order-bg text-pos-order-fg"><tr><th className="px-4 py-3">Venta</th><th className="px-4 py-3">Hora</th><th className="px-4 py-3">Método</th><th className="px-4 py-3 text-center">Productos</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-border">
              {register.accounts.map((sale) => (
                <tr key={sale.id}><td className="px-4 py-3 font-medium text-foreground">{sale.name}</td><td className="px-4 py-3 text-muted-foreground">{sale.closedAt ? dayjs(sale.closedAt).format("HH:mm") : "—"}</td><td className="px-4 py-3 text-muted-foreground">{paymentLabels[sale.paymentMethod ?? ""] ?? "—"}</td><td className="px-4 py-3 text-center text-foreground">{sale.accountItems.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="px-4 py-3 text-right font-semibold text-foreground">{money(sale.total)}</td></tr>
              ))}
              {register.accounts.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No hay ventas cerradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </details>
);

const Metric = ({ label, value }: { label: string; value: string }) => <div className="min-w-[85px] text-right"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold text-foreground">{value}</p></div>;
const Detail = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl bg-pos-surface p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-foreground">{value}</p></div>;
const EmptyState = ({ message }: { message: string }) => <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-pos-surface p-12 text-muted-foreground"><SearchX className="mb-3 h-9 w-9 opacity-40" /><p className="text-sm">{message}</p></div>;

export default CashRegisterHistory;
