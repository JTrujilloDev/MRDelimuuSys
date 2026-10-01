import { api } from "../../shared/services/api";

export interface OperationsReport {
  scope: {
    groups: Array<{ id: number; name: string; stores: Array<{ id: number; name: string; groupId: number }> }>;
    selectedStoreIds: number[];
    granularity: "DAY" | "WEEK" | "MONTH";
  };
  summary: {
    grossSales: number;
    discounts: number;
    netSales: number;
    saleCount: number;
    units: number;
    ticketAverage: number;
    expenses: number;
    outOfStock: number;
    lowStock: number;
    costOfSales?: number;
    estimatedMargin?: number;
    lossCost?: number;
    operatingResult?: number;
    inventoryValue?: number;
  };
  products: Array<{
    productVariantId: number;
    productName: string;
    variantName: string;
    units: number;
    grossSales: number;
    discounts: number;
    netSales: number;
    costOfSales?: number;
    estimatedMargin?: number;
  }>;
  losses: {
    movements: number;
    unvaluedMovements: number;
    unitsByReason: Record<string, number>;
    estimatedCost?: number;
  };
  timeline: Array<{
    period: string;
    grossSales: number;
    discounts: number;
    netSales: number;
    saleCount: number;
    cash: number;
    card: number;
    qr: number;
    credit: number;
    costOfSales?: number;
    estimatedMargin?: number;
    expenses: number;
    lossCost?: number;
    operatingResult?: number;
  }>;
  canViewCosts: boolean;
}

export const getOperationsReport = async (params: {
  from: string;
  to: string;
  groupId?: number;
  storeId?: number;
  granularity: "DAY" | "WEEK" | "MONTH";
}) => {
  const { data } = await api.get<{ success: true; data: OperationsReport }>("reports/operations", { params });
  return data.data;
};
