import { useQuery } from "@tanstack/react-query";
import { getPOSInventoryTransactions } from "../services/POSInventory.service";

export const useGetPOSInventoryTransactions = () => {
  return useQuery({
    queryKey: ["POSInventoryTransactions"],
    queryFn: getPOSInventoryTransactions,
  });
};
