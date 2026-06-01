import { useQuery } from "@tanstack/react-query";
import { getProductsByCategory } from "../services/products.service";

export const useGetProductsByCategory = (categoryId: number | null) => {
  return useQuery({
    queryKey: ["products", categoryId],
    queryFn: () => categoryId ? getProductsByCategory(categoryId) : Promise.resolve([]),
    enabled: !!categoryId,
  });
};
