import { useQuery } from "@tanstack/react-query";
import { getProductsByCategory } from "../services/products.service";

export const useGetProductsByCategory = (categoryId: number) => {
  return useQuery({
    queryKey: ["products", categoryId],
    queryFn: () => getProductsByCategory(categoryId),
    enabled: !!categoryId,
  });
};
