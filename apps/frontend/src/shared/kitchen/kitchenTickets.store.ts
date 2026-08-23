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
export type KitchenTicket = {
  id: number;
  accountId: number;
  accountName: string;
  status: KitchenTicketStatus;
  createdAt: string;
  items: KitchenTicketItem[];
};

const normalizeTicket = (ticket: any): KitchenTicket => ({
  ...ticket,
  accountName: ticket.accountName ?? ticket.account?.name ?? `Cuenta ${ticket.accountId}`,
  items: ticket.items.map((item: any) => ({
    ...item,
    productVariantId: item.productVariantId ?? item.accountItem?.productVariantId,
  })),
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
    return () => {
      socket.off("kitchen-ticket:created", refresh);
      socket.off("kitchen-ticket:updated", refresh);
    };
  }, [queryClient]);

  return query.data ?? [];
};

export const getActiveKitchenTicketsForAccount = (tickets: KitchenTicket[], accountId: number) =>
  tickets.filter((ticket) => ticket.accountId === accountId && ticket.status !== "DELIVERED");
