import { useMutation } from "@tanstack/react-query";
import { deleteProduct } from "../services/products.service";

export const useDeleteProduct = () => {
    return useMutation({mutationFn: deleteProduct})
};