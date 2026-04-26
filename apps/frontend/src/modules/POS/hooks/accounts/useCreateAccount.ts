import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAccount,
} from "../../services/account.service";

export const useCreateAccount = () => {
    const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
        queryClient.refetchQueries({ queryKey: ["accounts"] });
    }

  });
};
