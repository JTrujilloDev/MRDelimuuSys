import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../app/auth/AuthProvider";
import { getInventoryProducts } from "../services/products.service";

export const useGetInventoryProducts = () => {
  const { state } = useAuth();
  const storeId = state?.activeContext?.store.id;
  return useQuery({
    queryKey: ["getInventoryProducts", storeId],
    queryFn: getInventoryProducts,
    enabled: Boolean(storeId),
  });
};
