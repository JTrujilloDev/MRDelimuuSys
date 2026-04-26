import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "../services/products.service";

export const useCreateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({mutationFn: createProduct, onSuccess: () => {
        queryClient.refetchQueries({queryKey: ["getAllProducts"]});
    }});
};