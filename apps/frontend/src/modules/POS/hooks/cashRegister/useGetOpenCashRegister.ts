import { useQuery } from "@tanstack/react-query";
import { getOpenCashRegister } from "../../services/cashRegister.service";

export const useGetOpenCashRegister = (terminalId: number) => {
  return useQuery({
    queryKey: ["openCashRegister", terminalId],
    queryFn: () => getOpenCashRegister(terminalId),
    enabled: !!terminalId,
  });
};
