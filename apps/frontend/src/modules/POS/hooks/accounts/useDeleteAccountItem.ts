import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccountItem } from "../../services/account.service";

export const useDeleteAccountItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccountItem,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["accounts"] });
    },
  });
};
export default useDeleteAccountItem;
