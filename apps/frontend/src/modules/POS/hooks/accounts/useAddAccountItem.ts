import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addAccountItem } from "../../services/account.service";

export const useAddAccountItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addAccountItem,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["accounts"] });
    },
  });
};
