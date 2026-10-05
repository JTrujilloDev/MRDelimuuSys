import { api } from "../../shared/services/api";

export interface CreditPayment {
  id: number; amount: number; paymentMethod: string; createdAt: string;
  observation: string | null; cashRegisterId: number; receivedBy?: string;
  voidedAt: string | null; voidReason: string | null;
}
export interface CreditRecord {
  id: number; name: string; closedAt: string | null; total: number;
  customer: { name: string; phone: string | null } | null; terminal: string;
  paid: number; balance: number; status: "PENDING" | "PAID" | "CANCELLED"; payments: CreditPayment[];
}
export const getCredits = async () => (await api.get<{ data: CreditRecord[] }>("credits")).data.data;
export const payCredit = async (input: { accountId: number; cashRegisterId: number; amount: number; paymentMethod: string; observation: string; requestKey: string }) =>
  (await api.post(`credits/${input.accountId}/payments`, input)).data;
export const voidCreditPayment = async (input: { accountId: number; paymentId: number; cashRegisterId: number; reason: string }) =>
  (await api.post(`credits/${input.accountId}/payments/${input.paymentId}/void`, input)).data;
