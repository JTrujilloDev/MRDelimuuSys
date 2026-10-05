import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { BillingDocumentSnapshot } from "../billing/domain/billing-provider";
import { FactusClient } from "../billing/providers/factus/factus.client";
import { loadFactusConfiguration } from "../billing/providers/factus/factus.configuration";
import { FactusBillingProvider } from "../billing/providers/factus/factus.provider";

const buildReference = () => {
  const instant = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `DELISYS-SANDBOX-${instant}-${randomUUID().slice(0, 8)}`;
};

const snapshot = (referenceCode: string): BillingDocumentSnapshot => ({
  referenceCode,
  kind: "SALE_INVOICE",
  currency: "COP",
  issuedAt: new Date().toISOString(),
  customer: {
    identificationType: "CC",
    identification: "22222222222",
    organizationType: "NATURAL_PERSON",
    legalName: "Consumidor Final",
    tributeCode: "ZZ",
    responsibilities: ["R-99-PN"],
  },
  lines: [{
    reference: "DELISYS-TEST-IPC8",
    name: "Producto de prueba Delisys - Impoconsumo 8%",
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
  observation: "Prueba técnica Delisys en ambiente sandbox. No corresponde a una venta real.",
});

const main = async () => {
  const configuration = loadFactusConfiguration();
  if (configuration.environment !== "SANDBOX") {
    throw new Error("The smoke test is blocked outside the Factus sandbox");
  }

  const referenceCode = process.env.FACTUS_SMOKE_REFERENCE?.trim() || buildReference();
  const provider = new FactusBillingProvider(new FactusClient(configuration), {
    numberingRangeId: 389,
    sendEmail: false,
    paymentMethodCodes: { CASH: "10" },
  });

  const previous = await provider.findByReference(referenceCode);
  let result = previous ?? await provider.issue(snapshot(referenceCode));
  if (result.outcome === "UNKNOWN") {
    result = await provider.findByReference(referenceCode) ?? result;
  }

  const artifactSummaries: Array<{ kind: string; path: string; bytes: number }> = [];
  if (result.outcome === "ACCEPTED" && result.documentNumber) {
    const outputDirectory = resolve(process.cwd(), "tmp", "factus-sandbox", result.documentNumber);
    await mkdir(outputDirectory, { recursive: true });
    for (const kind of ["PDF", "XML", "ATTACHED_DOCUMENT_XML"] as const) {
      const artifact = await provider.getArtifact(result.documentNumber, kind);
      if (!artifact) continue;
      const content = Buffer.from(artifact.contentBase64, "base64");
      const suffix = kind === "PDF" ? "pdf" : kind === "XML" ? "xml" : "attached.xml";
      const path = resolve(outputDirectory, `${result.documentNumber}.${suffix}`);
      await writeFile(path, content);
      artifactSummaries.push({ kind, path, bytes: content.byteLength });
    }
  }

  console.log(JSON.stringify({
    environment: configuration.environment,
    referenceCode,
    outcome: result.outcome,
    providerStatus: result.providerStatus ?? null,
    documentNumber: result.documentNumber ?? null,
    fiscalIdentifier: result.fiscalIdentifier ?? null,
    acceptedAt: result.acceptedAt ?? null,
    code: result.code ?? null,
    message: result.message ?? null,
    diagnostics: result.diagnostics ?? null,
    artifacts: artifactSummaries,
  }, null, 2));

  if (result.outcome !== "ACCEPTED") process.exitCode = 2;
};

void main().catch((error) => {
  console.error(JSON.stringify({
    outcome: "FAILED",
    message: error instanceof Error ? error.message : "Unknown Factus smoke-test error",
  }, null, 2));
  process.exitCode = 1;
});
