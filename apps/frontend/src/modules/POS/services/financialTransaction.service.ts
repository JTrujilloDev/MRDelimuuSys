      import { api } from "../../../shared/services/api";

      export interface ExpenseRecord {
        id: number; amount: number; description: string | null;
        adjustmentJustification: string | null; createdAt: string;
        voidedAt: string | null; voidReason: string | null;
      }

      export const voidExpense = async (input: { id: number; cashRegisterId: number; reason: string }) => {
        const { data } = await api.post(`financial-transactions/${input.id}/void`, input);
        return data;
      };

      export const registerExpense = async (expenseData: { description: string; observation: string; amount: number; cashRegisterId: number; requestKey: string }) => {
        const { data } = await api.post("financial-transactions", {
          type: "EXPENSE",
          requestKey: expenseData.requestKey,
          relatedCashRegisterId: expenseData.cashRegisterId,
          description: expenseData.description,
          adjustmentJustification: expenseData.observation,
          amount: expenseData.amount,
          paymentMethod: "CASH",
        });
        return data;
      };

      export const getExpenses = async (cashRegisterId: number) => {
        const { data } = await api.get("financial-transactions", {
          params: { cashRegisterId, type: "EXPENSE", includeVoided: "true", limit: 1000 },
        });
        return data as { data: { data: ExpenseRecord[]; meta: { total: number } } };
      };
