import { api } from "../../../shared/services/api";

export interface InventoryTransactionFilters {
  search?: string;
  type?: string;
  origin?: "ALL" | "MANUAL" | "POS";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface InventoryTransactionItem {
  id: number;
  operationId: string | null;
  productVariantId: number;
  relatedAccountId: number | null;
  quantity: number;
  unit: string;
  type: string;
  observation: string | null;
  createdAt: string;
  productVariant: {
    id: number;
    name: string;
    unit: string;
    product: {
      id: number;
      name: string;
      productType: string;
    };
  };
}

export interface InventoryOperation {
  id: string;
  operationId: string | null;
  type: string;
  origin: "MANUAL" | "POS";
  observation: string | null;
  createdAt: string;
  items: InventoryTransactionItem[];
}

export interface InventoryTransactionsResponse {
  success: boolean;
  data: InventoryOperation[];
  summary: {
    operations: number;
    entriesByUnit: Record<string, number>;
    exitsByUnit: Record<string, number>;
    products: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalOperations: number;
    totalPages: number;
  };
}

export const getPOSInventoryTransactions = async (
  filters: InventoryTransactionFilters = {},
) => {
  const { data } = await api.get<InventoryTransactionsResponse>("pos-inventory", {
    params: filters,
  });
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

export interface BulkInventoryTransactionItem {
  productVariantId: number;
  quantity: number;
  observation?: string;
}

export const createBulkPOSInventoryTransaction = async (data: {
  type: string;
  observation?: string;
  items: BulkInventoryTransactionItem[];
}) => {
  const { data: response } = await api.post("pos-inventory/bulk", data);
  return response;
};
