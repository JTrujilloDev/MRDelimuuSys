import type {
  BillingArtifact,
  BillingArtifactKind,
  BillingDocumentSnapshot,
  BillingProvider,
  BillingProviderResult,
} from "../../domain/billing-provider";
import { FactusApiError, FactusClient } from "./factus.client";
import { buildFactusInvoicePayload } from "./factus.mapper";

type FactusProviderConfiguration = Parameters<typeof buildFactusInvoicePayload>[1];
type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const documentData = (response: unknown) => {
  if (!isRecord(response)) return {};
  return isRecord(response.data) ? response.data : response;
};

const text = (record: JsonRecord, key: string) =>
  typeof record[key] === "string" ? record[key] as string : undefined;

const normalizeDocument = (response: unknown): BillingProviderResult => {
  const data = documentData(response);
  const validated = data.is_validated === true;
  const links = isRecord(data.links) ? data.links : {};
  const providerNotifications = data.errors;
  const hasProviderNotifications = isRecord(providerNotifications)
    ? Object.keys(providerNotifications).length > 0
    : Array.isArray(providerNotifications) && providerNotifications.length > 0;
  return {
    outcome: validated ? "ACCEPTED" : "PROCESSING",
    providerDocumentId: data.id === undefined ? undefined : String(data.id),
    documentNumber: text(data, "number"),
    fiscalIdentifier: text(data, "cufe"),
    providerStatus: validated ? "VALIDATED" : "PENDING_VALIDATION",
    acceptedAt: validated ? text(data, "validated_at") : undefined,
    qrUrl: text(links, "qr"),
    publicUrl: text(links, "public_url"),
    diagnostics: {
      hasProviderNotifications,
      ...(hasProviderNotifications ? { providerNotifications } : {}),
    },
  };
};

const normalizeError = (error: unknown): BillingProviderResult => {
  if (!(error instanceof FactusApiError)) throw error;
  const rejected = error.status === 400 || error.status === 422;
  const response = isRecord(error.response) ? error.response : {};
  const validationErrors = response.errors ?? (isRecord(response.data) ? response.data.errors : undefined);
  return {
    outcome: rejected ? "REJECTED" : "UNKNOWN",
    providerStatus: rejected ? "VALIDATION_ERROR" : "REQUIRES_RECONCILIATION",
    code: error.status === null ? "NETWORK_ERROR" : `HTTP_${error.status}`,
    message: error.message,
    ...(validationErrors === undefined ? {} : { diagnostics: { validationErrors } }),
  };
};

const artifactFields: Record<BillingArtifactKind, { content: string; name: string; mediaType: string }> = {
  PDF: { content: "pdf_base_64_encoded", name: "file_name", mediaType: "application/pdf" },
  XML: { content: "xml_base_64_encoded", name: "file_name", mediaType: "application/xml" },
  ATTACHED_DOCUMENT_XML: { content: "xml_base_64_encoded", name: "file_name", mediaType: "application/xml" },
};

export class FactusBillingProvider implements BillingProvider {
  readonly name = "FACTUS";
  readonly capabilities = {
    lookupByReference: true,
    creditNotes: false,
    artifacts: ["PDF", "XML", "ATTACHED_DOCUMENT_XML"] as BillingArtifactKind[],
  };

  constructor(
    private readonly client: FactusClient,
    private readonly configuration: FactusProviderConfiguration,
  ) {}

  async issue(snapshot: BillingDocumentSnapshot): Promise<BillingProviderResult> {
    try {
      const response = await this.client.validateBill(buildFactusInvoicePayload(snapshot, this.configuration));
      return normalizeDocument(response);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async findByReference(referenceCode: string): Promise<BillingProviderResult | null> {
    try {
      const response = await this.client.findBillByReference(referenceCode);
      return response ? normalizeDocument(response) : null;
    } catch (error) {
      return normalizeError(error);
    }
  }

  async getArtifact(documentNumber: string, kind: BillingArtifactKind): Promise<BillingArtifact | null> {
    try {
      const response = documentData(await this.client.downloadBillArtifact(documentNumber, kind));
      const fields = artifactFields[kind];
      const contentBase64 = text(response, fields.content);
      if (!contentBase64) return null;
      return {
        kind,
        fileName: text(response, fields.name) ?? `${documentNumber}.${kind === "PDF" ? "pdf" : "xml"}`,
        mediaType: fields.mediaType,
        contentBase64,
      };
    } catch (error) {
      if (error instanceof FactusApiError && error.status === 404) return null;
      throw error;
    }
  }
}
