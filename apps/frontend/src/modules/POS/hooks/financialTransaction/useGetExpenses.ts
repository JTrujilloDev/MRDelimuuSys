import { useQuery } from "@tanstack/react-query";
import { getExpenses } from "../../services/financialTransaction.service";

export const useGetExpenses = (cashRegisterId: number) => {
  return useQuery({
    queryKey: ["expenses", cashRegisterId],
    queryFn: () => getExpenses(cashRegisterId),
  });
}