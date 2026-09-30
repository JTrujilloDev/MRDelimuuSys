import { useQuery } from "@tanstack/react-query";
import { getAllActiveProducts } from "../services/products.service";
import { useAuth } from "../../../app/auth/AuthProvider";

export const useGetAllActiveProducts = () => {
    const { state } = useAuth();
    const storeId = state?.activeContext?.store.id;
    return useQuery({
        queryKey: ["getAllActiveProducts", storeId],
        queryFn: getAllActiveProducts,
        enabled: Boolean(storeId),
    });
}
