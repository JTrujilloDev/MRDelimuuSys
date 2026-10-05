import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerExpense } from "../../services/financialTransaction.service";

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerExpense,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
    queryKey: ["openCashRegister"],
  });
  await queryClient.invalidateQueries({
    queryKey: ["expenses"],
  });
    },
  });
};
