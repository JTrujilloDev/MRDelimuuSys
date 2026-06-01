import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPOSInventoryTransaction } from "../services/POSInventory.service";

export const useCreatePOSInventoryTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPOSInventoryTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["POSInventoryTransactions"] });
        },
    });
};