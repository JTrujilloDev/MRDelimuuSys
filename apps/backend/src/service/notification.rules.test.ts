import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeHtml, renderShiftNotification, retryDelayMs, ShiftNotification, stockAlertLevel } from "./notification.rules";
import { buildShiftSalesSummary } from "./shiftSalesSummary.rules";

test("stock: normal, mínimo incluido, agotado y mínimo sin configurar", () => {
  assert.equal(stockAlertLevel(6, 5), "NORMAL");
  assert.equal(stockAlertLevel(5, 5), "LOW");
  assert.equal(stockAlertLevel(0, 5), "EMPTY");
  assert.equal(stockAlertLevel(-1, 0), "EMPTY");
  assert.equal(stockAlertLevel(1, 0), "NORMAL");
});

test("reintentos crecientes con límite de una hora", () => {
  assert.equal(retryDelayMs(1), 30_000);
  assert.equal(retryDelayMs(2), 60_000);
  assert.equal(retryDelayMs(8), 3_600_000);
});

test("resumen respeta cortesías, descuentos, anulaciones y escapa contenido HTML", () => {
  const totals = buildShiftSalesSummary([
    { status: "CLOSED", total: 0, discount: 7000, paymentMethod: "CASH" },
    { status: "CLOSED", total: 5000, discount: 2000, paymentMethod: "QR" },
    { status: "CANCELLED", total: 7000, discount: 0, paymentMethod: "CASH" },
  ]);
  const data: ShiftNotification = {
    shiftId: 7, store: "Veleño <1>", terminal: "Caja 1", user: "Ana",
    openedAt: "2026-10-01T12:00:00Z", closedAt: "2026-10-01T22:00:00Z",
    ...totals, openingAmount: 10000, totalExpenses: 1000, expectedCash: 9000,
    closingAmount: 9000, difference: 0, justification: "", cancelledCount: 1,
    observations: ['Cortesía <script>alert("x")</script>'],
  };
  const result = renderShiftNotification(data);
  assert.equal(data.totalSales, 5000);
  assert.equal(data.totalDiscounts, 9000);
  assert.equal(data.grossSales, 14000);
  assert.equal(data.saleCount, 2);
  assert.ok(result.html.includes("Veleño &lt;1&gt;"));
  assert.ok(!result.html.includes("<script>"));
  assert.ok(result.text.includes("Ventas anuladas (excluidas): 1"));
  assert.ok(result.push.includes("Veleño <1>"));
  assert.equal(escapeHtml("&'\""), "&amp;&#39;&quot;");
});
