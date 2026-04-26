import { useQuery } from "@tanstack/react-query";
import { getAllActiveProducts } from "../services/products.service";

export const useGetAllActiveProducts = () => {
    return useQuery({
        queryKey: ["getAllActiveProducts"],
        queryFn: getAllActiveProducts,
    });
}