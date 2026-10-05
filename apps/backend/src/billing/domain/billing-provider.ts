export type BillingEnvironment = "SANDBOX" | "PRODUCTION";
export type BillingDocumentKind = "SALE_INVOICE" | "CREDIT_NOTE";
export type BillingArtifactKind = "PDF" | "XML" | "ATTACHED_DOCUMENT_XML";
export type BillingProviderOutcome = "PROCESSING" | "ACCEPTED" | "REJECTED" | "UNKNOWN";
export type BillingIdentificationType = "NIT" | "CC" | "CE" | "PASSPORT" | "OTHER";
export type BillingOrganizationType = "LEGAL_ENTITY" | "NATURAL_PERSON";
export type BillingTaxKind = "VAT" | "CONSUMPTION" | "OTHER";
export type BillingPaymentTerm = "IMMEDIATE" | "CREDIT";
export type BillingPaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "QR" | "OTHER";
export type BillingUnit = "UNIT" | "GRAM" | "KILOGRAM" | "LITER" | "MILLILITER" | "PIECE" | "BOX" | "PACK";

export type BillingCustomer = {
  identificationType: BillingIdentificationType;
  identification: string;
  verificationDigit?: string;
  organizationType: BillingOrganizationType;
  legalName: string;
  tradeName?: string;
  address?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  municipalityCode?: string;
  tributeCode?: string;
  responsibilities?: string[];
  providerIdentificationCode?: string;
};

export type BillingTax = {
  kind: BillingTaxKind;
  rate: string;
  providerCode?: string;
  isExcluded?: boolean;
};

export type BillingLine = {
  reference: string;
  name: string;
  quantity: string;
  unit: BillingUnit;
  unitPriceBeforeTax: string;
  discountAmount: string;
  taxes: BillingTax[];
  note?: string;
};

export type BillingPayment = {
  term: BillingPaymentTerm;
  method: BillingPaymentMethod;
  amount: string;
  reference?: string;
  dueDate?: string;
};

export type BillingDocumentSnapshot = {
  referenceCode: string;
  kind: BillingDocumentKind;
  currency: "COP";
  issuedAt: string;
  customer: BillingCustomer;
  lines: BillingLine[];
  payments: BillingPayment[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  observation?: string;
};

export type BillingProviderCapabilities = {
  lookupByReference: boolean;
  creditNotes: boolean;
  artifacts: BillingArtifactKind[];
};

export type BillingProviderResult = {
  outcome: BillingProviderOutcome;
  providerDocumentId?: string;
  documentNumber?: string;
  fiscalIdentifier?: string;
  providerStatus?: string;
  acceptedAt?: string;
  qrUrl?: string;
  publicUrl?: string;
  code?: string;
  message?: string;
  diagnostics?: Record<string, unknown>;
};

export type BillingArtifact = {
  kind: BillingArtifactKind;
  fileName: string;
  mediaType: string;
  contentBase64: string;
};

export interface BillingProvider {
  readonly name: string;
  readonly capabilities: BillingProviderCapabilities;
  issue(snapshot: BillingDocumentSnapshot): Promise<BillingProviderResult>;
  findByReference(referenceCode: string): Promise<BillingProviderResult | null>;
  getArtifact(documentNumber: string, kind: BillingArtifactKind): Promise<BillingArtifact | null>;
}
