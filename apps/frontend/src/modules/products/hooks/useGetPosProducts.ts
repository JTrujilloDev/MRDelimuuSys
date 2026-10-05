import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../app/auth/AuthProvider";
import { getPosProducts } from "../services/products.service";

export const useGetPosProducts = (enabled: boolean) => {
  const { state } = useAuth();
  const storeId = state?.activeContext?.store.id;

  return useQuery({
    queryKey: ["products", "pos", storeId],
    queryFn: getPosProducts,
    enabled: Boolean(enabled && storeId),
  });
};
