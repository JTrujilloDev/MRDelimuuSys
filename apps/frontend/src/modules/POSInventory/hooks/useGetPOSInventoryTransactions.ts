import { useQuery } from "@tanstack/react-query";
import {
  getPOSInventoryTransactions,
  type InventoryTransactionFilters,
} from "../services/POSInventory.service";

export const useGetPOSInventoryTransactions = (
  filters: InventoryTransactionFilters = {},
) => {
  return useQuery({
    queryKey: ["POSInventoryTransactions", filters],
    queryFn: () => getPOSInventoryTransactions(filters),
    placeholderData: (previousData) => previousData,
  });
};
