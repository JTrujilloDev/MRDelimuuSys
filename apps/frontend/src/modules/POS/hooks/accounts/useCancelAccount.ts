import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelAccount } from "../../services/account.service";

export const useCancelAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["openCashRegister"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["getAllActiveProducts"] });
      void queryClient.invalidateQueries({ queryKey: ["pos-inventory"] });
    },
  });
};
