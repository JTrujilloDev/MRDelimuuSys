import "dotenv/config";
import { FactusApiError, FactusClient } from "../billing/providers/factus/factus.client";
import { loadFactusConfiguration } from "../billing/providers/factus/factus.configuration";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractRanges = (response: unknown): JsonRecord[] => {
  if (!isRecord(response)) return [];
  if (Array.isArray(response.data)) return response.data.filter(isRecord);
  if (isRecord(response.data) && Array.isArray(response.data.data)) {
    return response.data.data.filter(isRecord);
  }
  return [];
};

const safeRangeSummary = (range: JsonRecord) => ({
  id: range.id ?? null,
  document: range.document ?? null,
  prefix: range.prefix ?? null,
  resolutionNumber: range.resolution_number ?? null,
  from: range.from ?? null,
  to: range.to ?? null,
  current: range.current ?? null,
  startDate: range.start_date ?? null,
  endDate: range.end_date ?? null,
  isActive: range.is_active ?? null,
});

const verify = async () => {
  const configuration = loadFactusConfiguration();
  if (configuration.environment !== "SANDBOX") {
    throw new Error("This verification command only runs against the Factus sandbox");
  }

  const client = new FactusClient(configuration);
  await client.verifyAuthentication();

  let availableApiVersion: "v1" | "v2" | null = null;
  let response: unknown = null;
  const compatibilityErrors: Array<{ apiVersion: "v1" | "v2"; message: string }> = [];
  for (const apiVersion of ["v2", "v1"] as const) {
    try {
      response = await client.listNumberingRanges("21", apiVersion);
      availableApiVersion = apiVersion;
      break;
    } catch (error) {
      const isUnavailableVersion = error instanceof FactusApiError
        && /versión de api no disponible/i.test(error.message);
      if (!isUnavailableVersion) throw error;
      compatibilityErrors.push({ apiVersion, message: error.message });
    }
  }
  const ranges = extractRanges(response);

  console.log(JSON.stringify({
    authenticated: true,
    environment: configuration.environment,
    availableApiVersion,
    activeInvoiceRanges: ranges.map(safeRangeSummary),
    compatibilityErrors,
  }, null, 2));

  if (!availableApiVersion) process.exitCode = 2;
};

void verify().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown Factus verification error";
  console.error(JSON.stringify({ authenticated: false, error: message }, null, 2));
  process.exitCode = 1;
});
