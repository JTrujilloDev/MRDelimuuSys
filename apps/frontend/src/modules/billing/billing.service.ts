import { api } from "../../shared/services/api";

export type BillingStatus =
  | "PENDING"
  | "SENDING"
  | "PROCESSING"
  | "ACCEPTED"
  | "REJECTED"
  | "REQUIRES_RECONCILIATION"
  | "CANCELLED";

export interface BillingAttempt {
  id: number;
  attemptNumber: number;
  action: string;
  outcome: string;
  providerCode: string | null;
  providerMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ElectronicDocument {
  id: string;
  referenceCode: string;
  documentType: string;
  status: BillingStatus;
  subtotal: number | string;
  discountTotal: number | string;
  taxTotal: number | string;
  total: number | string;
  providerNumber: string | null;
  fiscalIdentifier: string | null;
  providerStatus: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  store: { id: number; name: string };
  issuer: { id: number; legalName: string; tradeName: string | null };
  providerConfiguration: { provider: string; environment: "SANDBOX" | "PRODUCTION" };
  account: {
    id: number;
    name: string;
    paymentMethod: string | null;
    customerSnapshot: Record<string, unknown> | null;
  } | null;
  attempts: BillingAttempt[];
}

export interface BillingDocumentsResponse {
  documents: ElectronicDocument[];
  stores: Array<{
    id: number;
    name: string;
    fiscalIssuer: { id: number; legalName: string; isActive: boolean } | null;
  }>;
}

export const getBillingDocuments = async (params: {
  status?: string;
  search?: string;
  storeId?: string;
}) => {
  const { data } = await api.get<{ success: true; data: BillingDocumentsResponse }>("billing/documents", { params });
  return data.data;
};

export const sendBillingDocument = async (documentId: string) => {
  const { data } = await api.post(`billing/documents/${documentId}/send`);
  return data.data;
};
