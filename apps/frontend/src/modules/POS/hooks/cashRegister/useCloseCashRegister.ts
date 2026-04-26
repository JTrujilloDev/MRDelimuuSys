import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeCashRegister } from "../../services/cashRegister.service";

export const useCloseCashRegister = () => {
    const queryClient =useQueryClient();
    return useMutation({mutationFn: closeCashRegister, onSuccess: () => {
        queryClient.refetchQueries({queryKey: ["openCashRegister"]});
    }});
}