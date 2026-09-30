import { api } from "../../shared/services/api";

export type CatalogGroup = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

export type GroupCatalogVariant = {
  id: number;
  name: string;
  isActive: boolean;
  productCost?: number;
  calculatedRecipeCost?: number | null;
  missingRecipeComponents?: string[];
  catalog: {
    id: number;
    salePrice: number | null;
    costPrice?: number;
    isPosActive: boolean;
    updatedAt?: string;
  } | null;
};

export type GroupCatalog = {
  group: CatalogGroup;
  products: Array<{
    id: number;
    name: string;
    productType: string;
    category: { id: number; name: string };
    variants: GroupCatalogVariant[];
  }>;
};

const unwrap = <T,>(response: { data: { data: T } }) => response.data.data;

export const getCatalogGroups = async () =>
  unwrap<Array<CatalogGroup & { stores: unknown[] }>>(await api.get("store-groups"));

export const getGroupCatalog = async (groupId: number) =>
  unwrap<GroupCatalog>(await api.get(`catalog/groups/${groupId}`));

export const updateGroupCatalogItem = async (
  groupId: number,
  variantId: number,
  payload: { salePrice: number | null; costPrice: number; isPosActive: boolean },
) => unwrap(await api.patch(`catalog/groups/${groupId}/variants/${variantId}`, payload));

export const deleteGroupCatalogItem = async (groupId: number, variantId: number) =>
  unwrap(await api.delete(`catalog/groups/${groupId}/variants/${variantId}`));
