import { api } from "../../../shared/services/api";

export const getPOSInventoryTransactions = async () => {
  const { data } = await api.get("pos-inventory");
  return data;
};

export const createPOSInventoryTransaction = async (data: {
  productVariantId: number | null;
  relatedAccountId?: number;
  quantity: number;
  type: string;
  observation?: string;
}) => {
  const { data: response } = await api.post("pos-inventory", data);
  return response;
};
