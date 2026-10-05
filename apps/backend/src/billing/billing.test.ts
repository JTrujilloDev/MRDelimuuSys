import assert from "node:assert/strict";
import test from "node:test";
import type { BillingDocumentSnapshot } from "./domain/billing-provider";
import { computeCashRoundingAmount, validateBillingSnapshot } from "./domain/billing.rules";
import { FactusClient } from "./providers/factus/factus.client";
import { loadFactusConfiguration } from "./providers/factus/factus.configuration";
import { buildFactusInvoicePayload } from "./providers/factus/factus.mapper";
import { FactusBillingProvider } from "./providers/factus/factus.provider";
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
  assert.equal(payload.items[0].discount_amount, undefined);
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

test("Factus client authenticates once and reuses its access token", async () => {
  const calls: Array<{ url: string; authorization?: string }> = [];
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, authorization: headers.get("Authorization") ?? undefined });
    if (url.endsWith("/oauth/token")) {
      return Response.json({ access_token: "access-test", refresh_token: "refresh-test", expires_in: 600 });
    }
    return Response.json({ data: { number: "SETP1", cufe: "cufe-test", is_validated: true } }, { status: 201 });
  };
  const client = new FactusClient({
    environment: "SANDBOX",
    credentials: { clientId: "id", clientSecret: "secret", username: "user", password: "password" },
  }, fakeFetch);
  const provider = new FactusBillingProvider(client, { paymentMethodCodes: { CASH: "10" } });

  const first = await provider.issue(invoice());
  const second = await provider.issue({ ...invoice(), referenceCode: "VELE-ACCOUNT-43" });

  assert.equal(first.outcome, "ACCEPTED");
  assert.equal(first.documentNumber, "SETP1");
  assert.equal(second.fiscalIdentifier, "cufe-test");
  assert.equal(calls.filter((call) => call.url.endsWith("/oauth/token")).length, 1);
  assert.deepEqual(calls.slice(1).map((call) => call.authorization), ["Bearer access-test", "Bearer access-test"]);
});

test("loads Factus credentials by reference without hard-coding secrets", () => {
  const configuration = loadFactusConfiguration({
    FACTUS_ENVIRONMENT: "sandbox",
    FACTUS_CREDENTIAL_REFERENCE: "FACTUS_TEST",
    FACTUS_TEST_CLIENT_ID: "id",
    FACTUS_TEST_CLIENT_SECRET: "secret",
    FACTUS_TEST_USERNAME: "user",
    FACTUS_TEST_PASSWORD: "password",
  });

  assert.equal(configuration.environment, "SANDBOX");
  assert.equal(configuration.credentials.username, "user");
  assert.throws(() => loadFactusConfiguration({
    FACTUS_CREDENTIAL_REFERENCE: "FACTUS_MISSING",
  }), /FACTUS_MISSING_CLIENT_ID/);
});

test("Factus client requests active invoice numbering ranges", async () => {
  const calls: string[] = [];
  const fakeFetch = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    return url.endsWith("/oauth/token")
      ? Response.json({ access_token: "access-test", expires_in: 600 })
      : Response.json({ data: [] });
  };
  const client = new FactusClient({
    environment: "SANDBOX",
    credentials: { clientId: "id", clientSecret: "secret", username: "user", password: "password" },
  }, fakeFetch);

  await client.listNumberingRanges();

  assert.match(calls[1], /\/v2\/numbering-ranges\?/);
  assert.match(calls[1], /filter%5Bdocument%5D=21/);
  assert.match(calls[1], /filter%5Bis_active%5D=1/);
});

test("Factus provider treats conflict and network uncertainty as reconciliation, not rejection", async () => {
  const conflictFetch = async (input: string | URL | Request) => String(input).endsWith("/oauth/token")
    ? Response.json({ access_token: "access-test", expires_in: 600 })
    : Response.json({ message: "Documento pendiente" }, { status: 409 });
  const client = new FactusClient({
    environment: "SANDBOX",
    credentials: { clientId: "id", clientSecret: "secret", username: "user", password: "password" },
  }, conflictFetch);
  const provider = new FactusBillingProvider(client, { paymentMethodCodes: { CASH: "10" } });

  const result = await provider.issue(invoice());
  assert.equal(result.outcome, "UNKNOWN");
  assert.equal(result.providerStatus, "REQUIRES_RECONCILIATION");
  assert.equal(result.code, "HTTP_409");
});

test("Factus provider preserves validation diagnostics without exposing credentials", async () => {
  const validationFetch = async (input: string | URL | Request) => String(input).endsWith("/oauth/token")
    ? Response.json({ access_token: "access-test", expires_in: 600 })
    : Response.json({ message: "Error de validación", errors: { "items.0.taxes.0.code": ["Código inválido"] } }, { status: 422 });
  const client = new FactusClient({
    environment: "SANDBOX",
    credentials: { clientId: "id", clientSecret: "secret", username: "user", password: "password" },
  }, validationFetch);
  const provider = new FactusBillingProvider(client, { paymentMethodCodes: { CASH: "10" } });

  const result = await provider.issue(invoice());

  assert.equal(result.outcome, "REJECTED");
  assert.deepEqual(result.diagnostics, {
    validationErrors: { "items.0.taxes.0.code": ["Código inválido"] },
  });
});
