import assert from "node:assert/strict";
import test from "node:test";
import { buildShiftSalesSummary } from "./shiftSalesSummary.rules";

test("reports gross sales, discounts, and net sales separately", () => {
  const summary = buildShiftSalesSummary([
    { status: "CLOSED", total: 6000, discount: 1000, paymentMethod: "CASH" },
    { status: "CLOSED", total: 8000, discount: 0, paymentMethod: "QR" },
  ]);
  assert.deepEqual(summary, {
    totalSales: 14000,
    totalDiscounts: 1000,
    grossSales: 15000,
    cashAmount: 6000,
    cardAmount: 0,
    qrAmount: 8000,
    creditAmount: 0,
    saleCount: 2,
  });
});

test("keeps a full courtesy visible and excludes cancelled sales", () => {
  const summary = buildShiftSalesSummary([
    { status: "CLOSED", total: 0, discount: 7000, paymentMethod: "QR" },
    { status: "CANCELLED", total: 5000, discount: 2000, paymentMethod: "CASH" },
  ]);
  assert.equal(summary.grossSales, 7000);
  assert.equal(summary.totalDiscounts, 7000);
  assert.equal(summary.totalSales, 0);
  assert.equal(summary.saleCount, 1);
});
