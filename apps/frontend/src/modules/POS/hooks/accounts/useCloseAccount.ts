import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeAccount } from "../../services/account.service";

export const useCloseAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["openCashRegister"] });
    },
  });
};
