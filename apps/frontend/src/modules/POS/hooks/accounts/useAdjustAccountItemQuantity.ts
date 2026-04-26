import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustAccountItemQuantity } from "../../services/account.service";

export const useAdjustAccountItemQuantity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adjustAccountItemQuantity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
};
