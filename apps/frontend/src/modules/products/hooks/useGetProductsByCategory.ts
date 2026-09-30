import { useQuery } from "@tanstack/react-query";
import { getProductsByCategory } from "../services/products.service";
import { useAuth } from "../../../app/auth/AuthProvider";

export const useGetProductsByCategory = (categoryId: number | null) => {
  const { state } = useAuth();
  const storeId = state?.activeContext?.store.id;
  return useQuery({
    queryKey: ["products", storeId, categoryId],
    queryFn: () => categoryId ? getProductsByCategory(categoryId) : Promise.resolve([]),
    enabled: Boolean(categoryId && storeId),
  });
};
