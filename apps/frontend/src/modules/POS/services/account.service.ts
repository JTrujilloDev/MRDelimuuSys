import { api } from "../../../shared/services/api";

export interface AccountData {
  name: string;
  userId: number;
  terminalId: number;
}

export interface AccountItem {
  accountId: number;
  productVariantId: number;
  productName: string;
  quantity?: number;
  price: number;
  subtotal?: number;
}

export const getAllAccounts = async (relatedUserId: number) => {
  const { data } = await api.get(`accounts/${relatedUserId}`);
  return data;
};

export const createAccount = async (accountData: AccountData) => {
  const { data } = await api.post("accounts", accountData);
  return data;
};

export const addAccountItem = async (accountData: AccountItem) => {
  const { data } = await api.put(`accounts/add-item`, {
    accountId: accountData.accountId,
    item: accountData,
  });
  return data;
};

export const deleteAccountItem = async (accountItemId: number) => {
  const { data } = await api.put(`accounts/remove-item`, {
    accountItemId,
  });
  return data;
};

export const adjustAccountItemQuantity = async ({
  accountItemId,
  delta,
}: {
  accountItemId: number;
  delta: number;
}) => {
  const { data } = await api.put(`accounts/adjust-quantity`, {
    accountItemId,
    delta,
  });
  return data;
};

export const deleteAccount = async (accountId: number) => {
  const { data } = await api.delete(`accounts/${accountId}`);
  return data;
};

export const closeAccount = async ({
  accountId,
  paymentMethod,
  cashRegisterId,
}: {
  accountId: number;
  paymentMethod: string;
  cashRegisterId: number;
}) => {
  const { data } = await api.put("accounts/close", {
    accountId,
    paymentMethod,
    cashRegisterId,
  });
  return data;
};
