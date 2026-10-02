import { useAuth } from "../auth/AuthProvider";
import { resolveBrand } from "./brand";

export const useBrand = () => {
  const { state } = useAuth();
  return resolveBrand(state?.activeContext?.store.group?.code);
};
