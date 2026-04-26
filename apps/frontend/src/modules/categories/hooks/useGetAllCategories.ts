import { useQuery } from "@tanstack/react-query";
import { getAllProductCategories } from "../services/categories.service";

export const useGetAllProductCategories = () => {
    return useQuery({
        queryKey:["getAllProductCategories"],
        queryFn: getAllProductCategories
    })
};