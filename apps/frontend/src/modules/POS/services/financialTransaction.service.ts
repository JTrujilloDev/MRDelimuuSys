      import { api } from "../../../shared/services/api";

      export const registerExpense = async (expenseData: { description: string; amount: number; cashRegisterId: number }) => {
        const { data } = await api.post("financial-transactions", {
          type: "EXPENSE",
          relatedCashRegisterId: expenseData.cashRegisterId,
          ...expenseData,
        });
        return data;
      };

      export const getExpenses = async (cashRegisterId: number) => {
        const { data } = await api.get("financial-transactions", {
          params: { cashRegisterId, type: "EXPENSE" },
        });
        return data;
      };