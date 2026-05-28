import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerExpense } from "../../services/financialTransaction.service";

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({
    queryKey: ["expenses", "cashRegisterId"],
  });
    },
  });
};
