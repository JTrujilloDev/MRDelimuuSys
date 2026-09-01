import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAccount } from "../../services/account.service";

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
};
