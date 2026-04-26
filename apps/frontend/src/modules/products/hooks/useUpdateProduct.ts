import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "../services/products.service";

export const useUpdateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({mutationFn: updateProduct, onSuccess: () => {
        queryClient.refetchQueries({queryKey: ["getAllProducts"]});
    }});
};