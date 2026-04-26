import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProductCategory } from "../services/categories.service";

export const useDeleteProductCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["getAllProductCategories"] });
    },
  });
};
