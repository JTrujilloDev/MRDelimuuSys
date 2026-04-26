import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductCategory } from "../services/categories.service";

export const useCreateProductCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["getAllProductCategories"] });
    },
  });
};
