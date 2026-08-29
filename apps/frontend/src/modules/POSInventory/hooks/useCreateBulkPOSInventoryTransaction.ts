import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBulkPOSInventoryTransaction } from "../services/POSInventory.service";

export const useCreateBulkPOSInventoryTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBulkPOSInventoryTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["POSInventoryTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["getAllActiveProducts"] });
    },
  });
};
