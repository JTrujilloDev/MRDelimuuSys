import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportPeriodKey,
  listReportPeriods,
  summarizeReportSales,
} from "./operationsReport.rules";

test("allocates sale discounts and preserves historical costs", () => {
  const result = summarizeReportSales([{
    total: 13_500,
    discount: 1_500,
    items: [
      { productVariantId: 1, productName: "Torta", variantName: "Porción", quantity: 1, subtotal: 10_000, unitCost: 4_000 },
      { productVariantId: 2, productName: "Café", variantName: "Mediano", quantity: 1, subtotal: 5_000, unitCost: 2_000 },
    ],
  }]);

  assert.equal(result.grossSales, 15_000);
  assert.equal(result.discounts, 1_500);
  assert.equal(result.netSales, 13_500);
  assert.equal(result.costOfSales, 6_000);
  assert.equal(result.estimatedMargin, 7_500);
  assert.equal(result.products[0].discounts, 1_000);
  assert.equal(result.products[1].discounts, 500);
});

test("groups report periods in the business timezone", () => {
  assert.equal(getReportPeriodKey("2026-09-30T03:00:00.000Z", "DAY"), "2026-09-29");
  assert.deepEqual(
    listReportPeriods(
      new Date("2026-09-01T05:00:00.000Z"),
      new Date("2026-09-03T04:59:59.000Z"),
      "DAY",
    ),
    ["2026-09-01", "2026-09-02"],
  );
});
