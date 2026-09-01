import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeAccount } from "../../services/account.service";

export const useCloseAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["openCashRegister"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["getAllActiveProducts"] });
    },
  });
};
