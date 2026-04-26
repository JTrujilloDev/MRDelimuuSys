import { useQuery } from "@tanstack/react-query";
import { getAllAccounts } from "../../services/account.service";

export const useGetAllAccounts = (relatedUserId?: number) => {
  return useQuery({
    queryKey: ["accounts", relatedUserId],
    queryFn: () => getAllAccounts(relatedUserId!),
    enabled: !!relatedUserId,
  });
};
