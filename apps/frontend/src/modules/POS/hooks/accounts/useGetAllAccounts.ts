import { useQuery } from "@tanstack/react-query";
import { getAllAccounts } from "../../services/account.service";

export const useGetAllAccounts = () => {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: getAllAccounts,
  });
};
