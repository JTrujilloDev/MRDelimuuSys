import { api } from "../../shared/services/api";

export interface TransferStore {
  id: number;
  name: string;
}

export interface InventoryTransferItem {
  id: number;
  quantitySent: number;
  quantityReceived: number | null;
  productVariant: {
    id: number;
    name: string;
    unit: string;
    product: { id: number; name: string };
  };
  inventoryLot: {
    id: number;
    code: string;
    manufacturedAt: string | null;
    expiresAt: string | null;
  };
}

export interface InventoryTransfer {
  id: number;
  status: "DISPATCHED" | "RECEIVED" | "CANCELLED";
  originStoreId: number;
  destinationStoreId: number;
  originStore: TransferStore;
  destinationStore: TransferStore;
  dispatchedByUser: { id: number; name: string };
  receivedByUser: { id: number; name: string } | null;
  cancelledByUser: { id: number; name: string } | null;
  dispatchObservation: string | null;
  receptionObservation: string | null;
  discrepancyReason: string | null;
  cancellationReason: string | null;
  dispatchedAt: string;
  receivedAt: string | null;
  cancelledAt: string | null;
  items: InventoryTransferItem[];
}

export const getInventoryTransferDestinations = async () => {
  const { data } = await api.get<{ success: true; data: TransferStore[] }>(
    "inventory-transfers/destinations",
  );
  return data.data;
};

export const getInventoryTransfers = async () => {
  const { data } = await api.get<{ success: true; data: InventoryTransfer[] }>(
    "inventory-transfers",
  );
  return data.data;
};

export const createInventoryTransfer = async (data: {
  destinationStoreId: number;
  observation?: string;
  items: Array<{ productVariantId: number; quantity: number }>;
}) => {
  const response = await api.post("inventory-transfers", data);
  return response.data;
};

export const receiveInventoryTransfer = async (
  transferId: number,
  data: {
    observation?: string;
    discrepancyReason?: string;
    items: Array<{ itemId: number; quantityReceived: number }>;
  },
) => {
  const response = await api.post(`inventory-transfers/${transferId}/receive`, data);
  return response.data;
};

export const cancelInventoryTransfer = async (
  transferId: number,
  reason: string,
) => {
  const response = await api.post(`inventory-transfers/${transferId}/cancel`, { reason });
  return response.data;
};
