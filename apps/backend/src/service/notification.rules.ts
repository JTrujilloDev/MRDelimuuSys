export const stockAlertLevel = (stock: number, minimum: number) =>
  stock <= 0 ? "EMPTY" : minimum > 0 && stock <= minimum ? "LOW" : "NORMAL";

export const retryDelayMs = (attempt: number) =>
  Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempt - 1));

export const escapeHtml = (value: unknown) => String(value ?? "").replace(
  /[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
);
const money = (value: unknown) => new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 2,
}).format(Number(value));

export interface ShiftNotification {
  shiftId: number;
  store: string;
  terminal: string;
  user: string;
  openedAt: string;
  closedAt: string;
  saleCount: number;
  grossSales: number;
  totalSales: number;
  totalDiscounts: number;
  cashAmount: number;
  cardAmount: number;
  qrAmount: number;
  creditAmount: number;
  creditCollections?: number;
  cashCreditCollections?: number;
  openingAmount: number;
  totalExpenses: number;
  expectedCash: number;
  closingAmount: number;
  difference: number;
  justification: string;
  cancelledCount: number;
  observations: string[];
}

export const renderShiftNotification = (data: ShiftNotification) => {
  const date = (value: string) => new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
  const rows: [string, string][] = [
    ["Punto", data.store], ["Terminal", data.terminal], ["Responsable", data.user],
    ["Apertura", date(data.openedAt)], ["Cierre", date(data.closedAt)],
    ["Ventas válidas", String(data.saleCount)], ["Ventas antes de descuento", money(data.grossSales)],
    ["Descuentos / cortesías", money(data.totalDiscounts)], ["Ventas netas", money(data.totalSales)],
    ["Ventas en efectivo", money(data.cashAmount)], ["Tarjeta", money(data.cardAmount)],
    ["QR", money(data.qrAmount)], ["Crédito", money(data.creditAmount)],
    ["Abonos de créditos recibidos", money(data.creditCollections || 0)], ["Abonos en efectivo", money(data.cashCreditCollections || 0)],
    ["Base inicial", money(data.openingAmount)], ["Gastos", money(data.totalExpenses)],
    ["Efectivo esperado", money(data.expectedCash)], ["Efectivo contado", money(data.closingAmount)],
    ["Diferencia", money(data.difference)], ["Justificación", data.justification || "Sin diferencia"],
    ["Ventas anuladas (excluidas)", String(data.cancelledCount)],
  ];
  const subject = `Cierre de turno #${data.shiftId} — ${data.store}`;
  return {
    subject,
    text: [subject, ...rows.map(([label, value]) => `${label}: ${value}`), "Observaciones:", ...data.observations].join("\n"),
    html: `<h2>${escapeHtml(subject)}</h2><table>${rows.map(([label, value]) => `<tr><th align="left" style="padding:6px">${escapeHtml(label)}</th><td style="padding:6px">${escapeHtml(value)}</td></tr>`).join("")}</table><h3>Observaciones</h3><ul>${data.observations.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`,
    push: `${data.store} · ${data.terminal}\nCierre: ${date(data.closedAt)}\nResponsable: ${data.user}\nVentas: ${money(data.totalSales)} · Descuentos: ${money(data.totalDiscounts)}\nEfectivo: ${money(data.closingAmount)} · Diferencia: ${money(data.difference)}`,
  };
};
