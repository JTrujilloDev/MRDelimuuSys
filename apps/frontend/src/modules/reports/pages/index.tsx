import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Banknote, Boxes, CircleDollarSign, PackageX, ReceiptText, Tag } from "lucide-react";
import numeral from "numeral";
import { useMemo, useState } from "react";
import { useAuth } from "../../../app/auth/AuthProvider";
import { getInventoryLossReasonLabel } from "../../../shared/constants/inventoryLossReasons";
import { getOperationsReport } from "../reports.service";

const money = (value?: number) => numeral(value ?? 0).format("$ 0,0");

const ReportsPage = () => {
  const { state } = useAuth();
  const isGlobalAdmin = Boolean(state?.user.isGlobalAdmin);
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [groupId, setGroupId] = useState("");
  const [storeId, setStoreId] = useState("");
  const invalidRange = dayjs(from).isAfter(dayjs(to), "day");
  const query = useQuery({
    queryKey: ["operations-report", from, to, groupId, storeId],
    queryFn: () => getOperationsReport({
      from: dayjs(from).startOf("day").toISOString(),
      to: dayjs(to).endOf("day").toISOString(),
      groupId: groupId ? Number(groupId) : undefined,
      storeId: storeId ? Number(storeId) : undefined,
    }),
    enabled: !invalidRange,
  });
  const report = query.data;
  const stores = useMemo(
    () => report?.scope.groups
      .filter((group) => !groupId || group.id === Number(groupId))
      .flatMap((group) => group.stores) ?? [],
    [groupId, report?.scope.groups],
  );

  return (
    <main className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Etapa 4</p>
          <h1 className="mt-1 text-3xl font-black text-foreground">Reportes de operación</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isGlobalAdmin ? "Consolida y compara los puntos de venta." : `Resultados de ${state?.activeContext?.store.name}.`}
          </p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-border bg-pos-surface p-4 md:grid-cols-2 lg:grid-cols-4">
          <DateField label="Desde" value={from} max={to} onChange={setFrom} />
          <DateField label="Hasta" value={to} min={from} onChange={setTo} />
          {isGlobalAdmin && <>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Grupo
              <select className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground" value={groupId} onChange={(event) => { setGroupId(event.target.value); setStoreId(""); }}>
                <option value="">Todos los grupos</option>
                {report?.scope.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Punto
              <select className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                <option value="">Todos los puntos</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
          </>}
        </section>

        {invalidRange ? <Notice text="La fecha inicial no puede ser posterior a la final." />
          : query.isLoading ? <Notice text="Calculando el reporte…" />
          : query.isError || !report ? <Notice text="No fue posible cargar el reporte." />
          : <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={Banknote} label="Venta bruta" value={money(report.summary.grossSales)} />
              <Metric icon={Tag} label="Descuentos" value={money(report.summary.discounts)} />
              <Metric icon={CircleDollarSign} label="Venta neta" value={money(report.summary.netSales)} />
              <Metric icon={ReceiptText} label="Ticket promedio" value={money(report.summary.ticketAverage)} />
              <Metric icon={ReceiptText} label="Ventas" value={String(report.summary.saleCount)} />
              <Metric icon={Boxes} label="Unidades vendidas" value={String(report.summary.units)} />
              <Metric icon={PackageX} label="Agotados" value={String(report.summary.outOfStock)} />
              <Metric icon={PackageX} label="Stock bajo" value={String(report.summary.lowStock)} />
            </section>

            {report.canViewCosts && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Metric icon={Boxes} label="Costo vendido" value={money(report.summary.costOfSales)} />
              <Metric icon={PackageX} label="Costo de mermas" value={money(report.summary.lossCost)} />
              <Metric icon={Banknote} label="Gastos" value={money(report.summary.expenses)} />
              <Metric icon={CircleDollarSign} label="Resultado operativo" value={money(report.summary.operatingResult)} />
              <Metric icon={Boxes} label="Valor de inventario" value={money(report.summary.inventoryValue)} />
            </section>}

            <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
              <section className="rounded-2xl border border-border bg-pos-surface p-5">
                <h2 className="font-bold text-foreground">Mermas por motivo</h2>
                <p className="mb-4 text-xs text-muted-foreground">{report.losses.movements} movimientos en el período</p>
                {Object.keys(report.losses.unitsByReason).length === 0 ? <p className="text-sm text-muted-foreground">Sin mermas registradas.</p> :
                  Object.entries(report.losses.unitsByReason).map(([reason, units]) => <div key={reason} className="flex justify-between border-t border-border py-2 text-sm"><span>{reason === "UNCLASSIFIED" ? "Histórico sin clasificar" : getInventoryLossReasonLabel(reason)}</span><b>{units}</b></div>)}
              </section>
              <section className="overflow-hidden rounded-2xl border border-border bg-pos-surface">
                <div className="p-5"><h2 className="font-bold text-foreground">Ventas por producto</h2><p className="text-xs text-muted-foreground">Descuentos distribuidos proporcionalmente entre los productos de cada venta.</p></div>
                <div className="max-h-[460px] overflow-auto"><table className="w-full min-w-[720px] text-sm"><thead className="sticky top-0 bg-pos-order-bg text-pos-order-fg"><tr><th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-right">Unidades</th><th className="px-4 py-3 text-right">Venta neta</th>{report.canViewCosts && <><th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Margen</th></>}</tr></thead><tbody className="divide-y divide-border">{report.products.map((product) => <tr key={product.productVariantId}><td className="px-4 py-3"><b>{product.productName}</b><span className="block text-xs text-muted-foreground">{product.variantName}</span></td><td className="px-4 py-3 text-right">{product.units}</td><td className="px-4 py-3 text-right">{money(product.netSales)}</td>{report.canViewCosts && <><td className="px-4 py-3 text-right">{money(product.costOfSales)}</td><td className="px-4 py-3 text-right font-bold">{money(product.estimatedMargin)}</td></>}</tr>)}{report.products.length === 0 && <tr><td colSpan={report.canViewCosts ? 5 : 3} className="px-4 py-10 text-center text-muted-foreground">Sin ventas en este período.</td></tr>}</tbody></table></div>
              </section>
            </div>
          </>}
      </div>
    </main>
  );
};

const DateField = ({ label, value, min, max, onChange }: { label: string; value: string; min?: string; max?: string; onChange: (value: string) => void }) => <label className="grid gap-1 text-xs font-semibold text-muted-foreground">{label}<input type="date" className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} /></label>;
const Metric = ({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) => <div className="flex items-center gap-3 rounded-2xl border border-border bg-pos-surface p-4"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-black text-foreground">{value}</p></div></div>;
const Notice = ({ text }: { text: string }) => <div className="rounded-2xl border border-border bg-pos-surface p-10 text-center text-sm text-muted-foreground">{text}</div>;

export default ReportsPage;
