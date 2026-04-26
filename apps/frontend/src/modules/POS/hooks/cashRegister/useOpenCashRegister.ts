import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openCashRegister } from "../../services/cashRegister.service";

export const useOpenCashRegister = () => {
    const queryClient =useQueryClient();
    return useMutation({mutationFn: openCashRegister, onSuccess: () => {
        queryClient.refetchQueries({queryKey: ["openCashRegister"]});
    }});
}