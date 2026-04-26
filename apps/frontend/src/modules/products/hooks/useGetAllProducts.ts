import { useQuery } from "@tanstack/react-query";
import { getAllProducts } from "../services/products.service";

export const useGetAllProducts = () => {
  return useQuery({
    queryKey: ["getAllProducts"],
    queryFn: getAllProducts,
  });
};
