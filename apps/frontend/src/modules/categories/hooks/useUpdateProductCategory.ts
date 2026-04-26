import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductCategory } from "../services/categories.service";

export const useUpdateProductCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProductCategory,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["getAllProductCategories"] });
    },
  });
};
