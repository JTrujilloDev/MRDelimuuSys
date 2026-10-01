import dayjs from "dayjs";
import numeral from "numeral";
import type { OperationsReport } from "../reports.service";

type TimelinePoint = OperationsReport["timeline"][number];
type NumericKey = {
  [K in keyof TimelinePoint]: TimelinePoint[K] extends number | undefined ? K : never
}[keyof TimelinePoint];

const chartColors = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)"];
const formatPeriod = (period: string, granularity: OperationsReport["scope"]["granularity"]) =>
  granularity === "MONTH" ? dayjs(period).format("MMM YYYY") : dayjs(period).format("DD MMM");

const ReportHistoryCharts = ({ report }: { report: OperationsReport }) => (
  <div className="space-y-6">
    <LineChart
      title="Evolución de ventas"
      description="Venta bruta, descuentos y venta neta por período."
      data={report.timeline}
      granularity={report.scope.granularity}
      series={[
        { key: "grossSales", label: "Venta bruta" },
        { key: "netSales", label: "Venta neta" },
        { key: "discounts", label: "Descuentos" },
      ]}
    />
    <PaymentChart data={report.timeline} granularity={report.scope.granularity} />
    {report.canViewCosts && (
      <LineChart
        title="Rentabilidad estimada"
        description="Margen de venta y resultado después de gastos y mermas valoradas."
        data={report.timeline}
        granularity={report.scope.granularity}
        series={[
          { key: "estimatedMargin", label: "Margen estimado" },
          { key: "operatingResult", label: "Resultado operativo" },
          { key: "expenses", label: "Gastos" },
          { key: "lossCost", label: "Costo de mermas" },
        ]}
      />
    )}
  </div>
);

const LineChart = ({
  title,
  description,
  data,
  granularity,
  series,
}: {
  title: string;
  description: string;
  data: TimelinePoint[];
  granularity: OperationsReport["scope"]["granularity"];
  series: Array<{ key: NumericKey; label: string }>;
}) => {
  const width = 900;
  const height = 280;
  const left = 72;
  const right = 20;
  const top = 20;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...data.flatMap((point) => series.map(({ key }) => Number(point[key] ?? 0))));
  const x = (index: number) => left + (index / Math.max(1, data.length - 1)) * plotWidth;
  const y = (value: number) => top + plotHeight - (value / maximum) * plotHeight;
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <section className="rounded-2xl border border-border bg-pos-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-bold text-foreground">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {series.map((item, index) => <span key={item.key} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[index] }} />{item.label}</span>)}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px]" role="img" aria-label={`${title}. ${description}`}>
          {[0, 0.5, 1].map((ratio) => {
            const lineY = top + plotHeight * ratio;
            const value = maximum * (1 - ratio);
            return <g key={ratio}><line x1={left} x2={width - right} y1={lineY} y2={lineY} stroke="var(--border)" /><text x={left - 10} y={lineY + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{numeral(value).format("$0a")}</text></g>;
          })}
          {series.map((item, seriesIndex) => {
            const path = data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(Number(point[item.key] ?? 0))}`).join(" ");
            return <g key={item.key}><path d={path} fill="none" stroke={chartColors[seriesIndex]} strokeWidth="3" strokeLinejoin="round" />{data.map((point, index) => <circle key={point.period} cx={x(index)} cy={y(Number(point[item.key] ?? 0))} r="4" fill={chartColors[seriesIndex]}><title>{`${item.label}: ${numeral(Number(point[item.key] ?? 0)).format("$ 0,0")} · ${formatPeriod(point.period, granularity)}`}</title></circle>)}</g>;
          })}
          {data.map((point, index) => (index % labelEvery === 0 || index === data.length - 1) && <text key={point.period} x={x(index)} y={height - 14} textAnchor="middle" fill="var(--muted)" fontSize="11">{formatPeriod(point.period, granularity)}</text>)}
        </svg>
      </div>
    </section>
  );
};

const PaymentChart = ({ data, granularity }: { data: TimelinePoint[]; granularity: OperationsReport["scope"]["granularity"] }) => {
  const width = 900;
  const height = 260;
  const left = 72;
  const right = 20;
  const top = 18;
  const bottom = 48;
  const plotHeight = height - top - bottom;
  const payments = [
    { key: "cash" as const, label: "Efectivo" },
    { key: "card" as const, label: "Tarjeta" },
    { key: "qr" as const, label: "QR" },
    { key: "credit" as const, label: "Crédito" },
  ];
  const totals = data.map((point) => payments.reduce((sum, payment) => sum + point[payment.key], 0));
  const maximum = Math.max(1, ...totals);
  const slot = (width - left - right) / Math.max(1, data.length);
  const barWidth = Math.max(8, Math.min(48, slot * 0.65));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <section className="rounded-2xl border border-border bg-pos-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-foreground">Medios de pago</h2><p className="text-xs text-muted-foreground">Composición de la venta neta por período.</p></div><div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{payments.map((payment, index) => <span key={payment.key} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: chartColors[index] }} />{payment.label}</span>)}</div></div>
      <div className="mt-4 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px]" role="img" aria-label="Medios de pago por período">
        {[0, 0.5, 1].map((ratio) => { const lineY = top + plotHeight * ratio; return <g key={ratio}><line x1={left} x2={width - right} y1={lineY} y2={lineY} stroke="var(--border)" /><text x={left - 10} y={lineY + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{numeral(maximum * (1 - ratio)).format("$0a")}</text></g>; })}
        {data.map((point, index) => { let accumulated = 0; const center = left + slot * index + slot / 2; return <g key={point.period}>{payments.map((payment, paymentIndex) => { const value = point[payment.key]; const segmentHeight = (value / maximum) * plotHeight; const segmentY = top + plotHeight - accumulated - segmentHeight; accumulated += segmentHeight; return <rect key={payment.key} x={center - barWidth / 2} y={segmentY} width={barWidth} height={segmentHeight} fill={chartColors[paymentIndex]}><title>{`${payment.label}: ${money(value)} · ${formatPeriod(point.period, granularity)}`}</title></rect>; })}{(index % labelEvery === 0 || index === data.length - 1) && <text x={center} y={height - 14} textAnchor="middle" fill="var(--muted)" fontSize="11">{formatPeriod(point.period, granularity)}</text>}</g>; })}
      </svg></div>
    </section>
  );
};

const money = (value: number) => numeral(value).format("$ 0,0");

export default ReportHistoryCharts;
