import { api } from "../../shared/services/api";

export type UserRole = "ADMIN" | "CASHIER" | "KITCHEN" | "WAITER" | "BAKERY";
export type KitchenMode = "NONE" | "TICKETS";

export type AuthTerminal = {
  id: number;
  code: string;
  name: string;
};

export type AuthStore = {
  id: number;
  groupId: number;
  code: string;
  name: string;
  kitchenMode: KitchenMode;
  role: UserRole;
  terminals: AuthTerminal[];
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isGlobalAdmin: boolean;
};

export type ActiveContext = {
  store: AuthStore;
  terminal: AuthTerminal;
  role: UserRole;
};

export type AuthState = {
  user: AuthUser;
  stores: AuthStore[];
  activeContext: ActiveContext | null;
};

type ApiResponse<T> = { success: true; data: T };

export const loginRequest = async (email: string, password: string) => {
  const { data } = await api.post<ApiResponse<AuthState>>("auth/login", { email, password });
  return data.data;
};

export const getCurrentSessionRequest = async () => {
  const { data } = await api.get<ApiResponse<AuthState>>("auth/me");
  return data.data;
};

export const selectContextRequest = async (storeId: number, terminalId: number) => {
  const { data } = await api.post<ApiResponse<AuthState>>("auth/context", {
    storeId,
    terminalId,
  });
  return data.data;
};

export const logoutRequest = () => api.post("auth/logout");

