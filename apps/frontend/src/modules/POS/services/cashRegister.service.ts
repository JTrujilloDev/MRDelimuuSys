import { api } from "../../../shared/services/api";

export const openCashRegister = async (cashRegisterData: { terminalId: number; openingAmount: number }) => {
  const { data } = await api.post("cash-register/open", cashRegisterData);
  return data;
};

export const getOpenCashRegister = async (terminalId: number) => {
  const { data } = await api.get(`cash-register/open/${terminalId}`);
  return data;
};

export const getCashRegisterHistory = async (from: string, to: string) => {
  const { data } = await api.get("cash-register/history", {
    params: { from, to },
  });
  return data;
};

export const closeCashRegister = async ({
  cashRegisterId,
  closingAmount,
}: {
  cashRegisterId: number;
  closingAmount: number;
}) => {
  const { data } = await api.post("cash-register/close", {
    cashRegisterId,
    closingAmount,
  });
  return data;
};
