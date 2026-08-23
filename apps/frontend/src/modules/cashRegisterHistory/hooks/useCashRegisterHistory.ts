import { useQuery } from "@tanstack/react-query";
import { getCashRegisterHistory } from "../../POS/services/cashRegister.service";

export const useCashRegisterHistory = (from: string, to: string, enabled = true) =>
  useQuery({
    queryKey: ["cashRegisterHistory", from, to],
    queryFn: () => getCashRegisterHistory(from, to),
    enabled,
  });
