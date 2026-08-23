import { KitchenTicketStatus } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

type CreateKitchenTicketInput = {
  accountId: number;
  items: { accountItemId: number; quantity: number }[];
};

const ticketInclude = {
  account: { select: { id: true, name: true } },
  items: {
    orderBy: { id: "asc" as const },
    include: { accountItem: { select: { productVariantId: true } } },
  },
};

export const getKitchenTicketsService = async (accountId?: number) =>
  prisma.kitchenTicket.findMany({
    where: accountId ? { accountId } : undefined,
    include: ticketInclude,
    orderBy: { createdAt: "asc" },
  });

export const createKitchenTicketService = async ({ accountId, items }: CreateKitchenTicketInput) => {
  if (!accountId || !items?.length) throw new Error("accountId and items are required");

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: { accountItems: { include: { productVariant: true } } },
    });
    if (!account || account.status !== "OPEN") throw new Error("Open account not found");

    const requestedItems = items.map((requested) => {
      const accountItem = account.accountItems.find((item) => item.id === requested.accountItemId);
      if (!accountItem) throw new Error(`Account item ${requested.accountItemId} not found`);
      if (!accountItem.productVariant.requirePreparation) {
        throw new Error(`${accountItem.productName} does not require preparation`);
      }
      if (!Number.isInteger(requested.quantity) || requested.quantity <= 0) {
        throw new Error("Ticket quantities must be positive integers");
      }
      return { requested, accountItem };
    });

    const alreadySent = await tx.kitchenTicketItem.groupBy({
      by: ["accountItemId"],
      where: { accountItemId: { in: requestedItems.map(({ accountItem }) => accountItem.id) } },
      _sum: { quantity: true },
    });

    for (const { requested, accountItem } of requestedItems) {
      const sent = alreadySent.find((item) => item.accountItemId === accountItem.id)?._sum.quantity ?? 0;
      if (sent + requested.quantity > accountItem.quantity) {
        throw new Error(`Quantity for ${accountItem.productName} was already sent to kitchen`);
      }
    }

    return tx.kitchenTicket.create({
      data: {
        accountId,
        items: {
          create: requestedItems.map(({ requested, accountItem }) => ({
            accountItemId: accountItem.id,
            productName: accountItem.productName,
            quantity: requested.quantity,
          })),
        },
      },
      include: ticketInclude,
    });
  });
};

const allowedTransitions: Record<KitchenTicketStatus, KitchenTicketStatus[]> = {
  PENDING: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"],
  DELIVERED: [],
};

export const updateKitchenTicketStatusService = async (id: number, status: KitchenTicketStatus) => {
  const ticket = await prisma.kitchenTicket.findUnique({ where: { id } });
  if (!ticket) throw new Error("Kitchen ticket not found");
  if (!allowedTransitions[ticket.status].includes(status)) {
    throw new Error(`Cannot change kitchen ticket from ${ticket.status} to ${status}`);
  }
  return prisma.kitchenTicket.update({ where: { id }, data: { status }, include: ticketInclude });
};
