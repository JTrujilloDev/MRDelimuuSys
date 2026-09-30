import { api } from "../../shared/services/api";
import type { KitchenMode, UserRole } from "../../app/auth/auth.service";

export type AdminTerminal = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

export type AdminStore = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  kitchenMode: KitchenMode;
  terminals: AdminTerminal[];
};

export type StoreGroup = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  stores: AdminStore[];
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  isGlobalAdmin: boolean;
  lastLoginAt?: string | null;
  storeAccesses: Array<{
    storeId: number;
    role: UserRole;
    isActive: boolean;
    store: AdminStore & { group: StoreGroup };
  }>;
};

export type UserPayload = {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  isGlobalAdmin?: boolean;
  accesses?: Array<{ storeId: number; role: UserRole }>;
};

export type GroupCatalogVariant = {
  id: number;
  name: string;
  isActive: boolean;
  retailPrice: number;
  catalog: {
    id: number;
    salePrice: number;
    isActive: boolean;
  } | null;
};

export type GroupCatalog = {
  group: Pick<StoreGroup, "id" | "code" | "name" | "isActive">;
  products: Array<{
    id: number;
    name: string;
    productType: string;
    category: { id: number; name: string };
    variants: GroupCatalogVariant[];
  }>;
};

const unwrap = <T,>(response: { data: { data: T } }) => response.data.data;

export const getUsers = async () => unwrap<AdminUser[]>(await api.get("users"));
export const createUser = async (payload: Required<Pick<UserPayload, "name" | "email" | "password">> & UserPayload) =>
  unwrap<AdminUser>(await api.post("users", payload));
export const updateUser = async (id: number, payload: UserPayload) =>
  unwrap<AdminUser>(await api.put(`users/${id}`, payload));

export const getStoreGroups = async () =>
  unwrap<StoreGroup[]>(await api.get("store-groups"));
export const updateStore = async (id: number, payload: Partial<Pick<AdminStore, "name" | "isActive" | "kitchenMode">>) =>
  unwrap<AdminStore>(await api.patch(`store/${id}`, payload));
export const createTerminal = async (payload: { storeId: number; code: string; name: string }) =>
  unwrap<AdminTerminal>(await api.post("terminal", payload));
export const updateTerminal = async (id: number, payload: Partial<Pick<AdminTerminal, "name" | "isActive">>) =>
  unwrap<AdminTerminal>(await api.patch(`terminal/${id}`, payload));

export const getGroupCatalog = async (groupId: number) =>
  unwrap<GroupCatalog>(await api.get(`catalog/groups/${groupId}`));
export const updateGroupCatalogItem = async (
  groupId: number,
  variantId: number,
  payload: { salePrice: number; isActive: boolean },
) => unwrap(await api.patch(`catalog/groups/${groupId}/variants/${variantId}`, payload));

