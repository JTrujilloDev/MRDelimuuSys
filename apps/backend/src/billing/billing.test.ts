import assert from "node:assert/strict";
import test from "node:test";
import type { BillingDocumentSnapshot } from "./domain/billing-provider";
import { computeCashRoundingAmount, validateBillingSnapshot } from "./domain/billing.rules";
import { buildFactusInvoicePayload } from "./providers/factus/factus.mapper";
import { MockBillingProvider } from "./providers/mock-billing.provider";

const invoice = (overrides: Partial<BillingDocumentSnapshot> = {}): BillingDocumentSnapshot => ({
  referenceCode: "VELE-ACCOUNT-42",
  kind: "SALE_INVOICE",
  currency: "COP",
  issuedAt: "2026-10-05T18:00:00.000Z",
  customer: {
    identificationType: "NIT",
    identification: "900123456",
    verificationDigit: "7",
    organizationType: "LEGAL_ENTITY",
    legalName: "Cliente de prueba SAS",
    countryCode: "CO",
  },
  lines: [{
    reference: "ARROZ-LECHE",
    name: "Arroz con leche",
    quantity: "1",
    unit: "UNIT",
    unitPriceBeforeTax: "10000",
    discountAmount: "0",
    taxes: [{ kind: "CONSUMPTION", rate: "8" }],
  }],
  payments: [{ term: "IMMEDIATE", method: "CASH", amount: "10800" }],
  subtotal: "10000",
  discountTotal: "0",
  taxTotal: "800",
  total: "10800",
  ...overrides,
});

test("maps a Veleño invoice to Factus standard invoice and 8% consumption tax", () => {
  const payload = buildFactusInvoicePayload(invoice(), {
    numberingRangeId: 389,
    paymentMethodCodes: { CASH: "10" },
  });

  assert.equal(payload.document, "01");
  assert.equal(payload.operation_type, "10");
  assert.equal(payload.customer.identification_document_code, "31");
  assert.equal(payload.customer.company, "Cliente de prueba SAS");
  assert.equal(payload.items[0].taxes[0].code, "04");
  assert.equal(payload.items[0].taxes[0].rate, "8.00");
  assert.equal(payload.cash_rounding_amount, "0.00");
});

test("requires due date for credit invoices", () => {
  const snapshot = invoice({ payments: [{ term: "CREDIT", method: "OTHER", amount: "10800" }] });
  assert.throws(() => validateBillingSnapshot(snapshot), /due date/);
});

test("calculates a bounded cash rounding adjustment without floating point", () => {
  assert.equal(computeCashRoundingAmount("10000", [
    { term: "IMMEDIATE", method: "CASH", amount: "9999.50" },
  ]), "0.50");
  assert.throws(() => computeCashRoundingAmount("10000", [
    { term: "IMMEDIATE", method: "CASH", amount: "9000" },
  ]), /more than COP 500/);
});

test("mock provider is idempotent and never claims fiscal acceptance", async () => {
  const provider = new MockBillingProvider();
  const first = await provider.issue(invoice());
  const repeated = await provider.issue(invoice());

  assert.deepEqual(repeated, first);
  assert.equal(first.outcome, "PROCESSING");
  assert.equal(first.providerStatus, "SIMULATED_NOT_FISCALLY_VALID");
  assert.equal(await provider.getArtifact("mock", "PDF"), null);
});
