import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { socket } from "../socket/socket";

export type KitchenTicketStatus = "PENDING" | "PREPARING" | "READY" | "DELIVERED";
export type KitchenTicketItem = {
  id?: number;
  accountItemId: number;
  productVariantId?: number;
  productName: string;
  quantity: number;
  note?: string;
};
export type KitchenTicketAdjustment = {
  id: number;
  kitchenTicketId: number;
  accountItemId: number;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  quantityDelta: number;
  status: "PENDING" | "ACKNOWLEDGED";
  createdAt: string;
  acknowledgedAt?: string | null;
};
export type KitchenTicket = {
  id: number;
  accountId: number;
  accountName: string;
  status: KitchenTicketStatus;
  createdAt: string;
  items: KitchenTicketItem[];
  adjustments: KitchenTicketAdjustment[];
};

const normalizeTicket = (ticket: any): KitchenTicket => ({
  ...ticket,
  accountName: ticket.accountName ?? ticket.account?.name ?? `Cuenta ${ticket.accountId}`,
  items: ticket.items.map((item: any) => ({
    ...item,
    productVariantId: item.productVariantId ?? item.accountItem?.productVariantId,
  })),
  adjustments: ticket.adjustments ?? [],
});

export const createKitchenTicket = async (
  ticket: Omit<KitchenTicket, "id" | "status" | "createdAt">,
) => {
  const { data } = await api.post("kitchen-tickets", {
    accountId: ticket.accountId,
    items: ticket.items.map(({ accountItemId, quantity }) => ({ accountItemId, quantity })),
  });
  return normalizeTicket(data.data);
};

export const updateKitchenTicketStatus = async (id: number, status: KitchenTicketStatus) => {
  const { data } = await api.patch(`kitchen-tickets/${id}/status`, { status });
  return normalizeTicket(data.data);
};

export const createKitchenTicketAdjustment = async (input: {
  accountId: number;
  accountItemId: number;
  newQuantity: number;
}) => {
  const { data } = await api.post("kitchen-tickets/adjustments", input);
  return data.data as KitchenTicketAdjustment;
};

export const acknowledgeKitchenTicketAdjustment = async (id: number) => {
  const { data } = await api.patch(`kitchen-tickets/adjustments/${id}/acknowledge`);
  return data.data as KitchenTicketAdjustment;
};

export const useKitchenTickets = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["kitchenTickets"],
    queryFn: async () => {
      const { data } = await api.get("kitchen-tickets");
      return data.data.map(normalizeTicket) as KitchenTicket[];
    },
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
    socket.on("kitchen-ticket:created", refresh);
    socket.on("kitchen-ticket:updated", refresh);
    socket.on("kitchen-ticket:adjusted", refresh);
    socket.on("kitchen-ticket:adjustment-acknowledged", refresh);
    return () => {
      socket.off("kitchen-ticket:created", refresh);
      socket.off("kitchen-ticket:updated", refresh);
      socket.off("kitchen-ticket:adjusted", refresh);
      socket.off("kitchen-ticket:adjustment-acknowledged", refresh);
    };
  }, [queryClient]);

  return query.data ?? [];
};

export const getActiveKitchenTicketsForAccount = (tickets: KitchenTicket[], accountId: number) =>
  tickets.filter((ticket) => ticket.accountId === accountId && ticket.status !== "DELIVERED");
