import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount } from "../../services/account.service";

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["accounts"] });
    },
  });
};
