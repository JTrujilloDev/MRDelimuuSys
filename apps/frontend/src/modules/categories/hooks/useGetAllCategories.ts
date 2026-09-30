import { useQuery } from "@tanstack/react-query";
import { getAllProductCategories } from "../services/categories.service";
import { useAuth } from "../../../app/auth/AuthProvider";

export const useGetAllProductCategories = (catalogOnly = false) => {
    const { state } = useAuth();
    const storeId = catalogOnly ? state?.activeContext?.store.id : undefined;
    return useQuery({
        queryKey:["getAllProductCategories", catalogOnly, storeId],
        queryFn: () => getAllProductCategories(catalogOnly),
        enabled: !catalogOnly || Boolean(storeId),
    })
};
