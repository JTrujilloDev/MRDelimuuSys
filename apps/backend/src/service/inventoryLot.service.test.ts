import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReceiptLotDetails } from "./inventoryLot.service";

const today = new Date("2026-09-30T12:00:00.000Z");

test("requires traceability fields for plant receipts", () => {
  assert.throws(
    () => normalizeReceiptLotDetails("RECEIPT", {}, today),
    /Lot code is required/,
  );
  assert.throws(
    () => normalizeReceiptLotDetails("RECEIPT", { lotCode: "L-1" }, today),
    /Expiration date/,
  );
});

test("normalizes a valid plant lot", () => {
  const lot = normalizeReceiptLotDetails(
    "RECEIPT",
    {
      lotCode: " lote-01 ",
      manufacturedAt: "2026-09-20",
      expiresAt: "2026-10-15",
    },
    today,
  );

  assert.equal(lot?.code, "LOTE-01");
  assert.equal(lot?.manufacturedAt?.toISOString().slice(0, 10), "2026-09-20");
  assert.equal(lot?.expiresAt.toISOString().slice(0, 10), "2026-10-15");
});

test("rejects expired receipts and inconsistent dates", () => {
  assert.throws(
    () => normalizeReceiptLotDetails(
      "RECEIPT",
      { lotCode: "L-2", expiresAt: "2026-09-29" },
      today,
    ),
    /Expired products/,
  );
  assert.throws(
    () => normalizeReceiptLotDetails(
      "RECEIPT",
      {
        lotCode: "L-3",
        manufacturedAt: "2026-10-02",
        expiresAt: "2026-10-01",
      },
      today,
    ),
    /Manufacturing date/,
  );
});

test("does not require a lot for other manual entries", () => {
  assert.equal(normalizeReceiptLotDetails("PURCHASE", {}, today), null);
});
