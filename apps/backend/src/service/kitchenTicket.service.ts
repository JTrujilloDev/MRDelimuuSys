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
  adjustments: { orderBy: { createdAt: "asc" as const } },
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
    const sentAdjustments = await tx.kitchenTicketAdjustment.groupBy({
      by: ["accountItemId"],
      where: { accountItemId: { in: requestedItems.map(({ accountItem }) => accountItem.id) } },
      _sum: { quantityDelta: true },
    });

    for (const { requested, accountItem } of requestedItems) {
      const sent = alreadySent.find((item) => item.accountItemId === accountItem.id)?._sum.quantity ?? 0;
      const adjusted = sentAdjustments.find((item) => item.accountItemId === accountItem.id)?._sum.quantityDelta ?? 0;
      const effectiveSent = sent + adjusted;
      if (effectiveSent + requested.quantity > accountItem.quantity) {
        throw new Error(`La cantidad de ${accountItem.productName} ya fue enviada a cocina`);
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

export const createKitchenTicketAdjustmentService = async ({
  accountId,
  accountItemId,
  newQuantity,
}: {
  accountId: number;
  accountItemId: number;
  newQuantity: number;
}) => prisma.$transaction(async (tx) => {
  if (!Number.isInteger(newQuantity) || newQuantity < 0) throw new Error("Invalid new quantity");

  const accountItem = await tx.accountItem.findFirst({
    where: { id: accountItemId, accountId, account: { status: "OPEN" } },
  });
  if (!accountItem) throw new Error("Open account item not found");

  const ticketItems = await tx.kitchenTicketItem.findMany({
    where: {
      accountItemId,
      kitchenTicket: { accountId, status: { not: "DELIVERED" } },
    },
    include: { kitchenTicket: true, adjustments: true },
    orderBy: { id: "desc" },
  });
  if (!ticketItems.length) throw new Error("No active kitchen ticket found for this product");

  const sentQuantity = ticketItems.reduce((total, item) => total + item.quantity, 0);
  const existingAdjustments = await tx.kitchenTicketAdjustment.aggregate({
    where: { accountItemId },
    _sum: { quantityDelta: true },
  });
  const effectiveQuantity = sentQuantity + (existingAdjustments._sum.quantityDelta ?? 0);
  const quantityDelta = newQuantity - effectiveQuantity;

  if (quantityDelta >= 0) throw new Error("The requested quantity does not cancel sent units");
  if (newQuantity >= accountItem.quantity) throw new Error("The new quantity must be lower than the account quantity");

  const targetTicketItem = ticketItems.find((item) =>
    item.quantity + item.adjustments.reduce((total, adjustment) => total + adjustment.quantityDelta, 0) > 0,
  );
  if (!targetTicketItem) throw new Error("No remaining kitchen units can be cancelled");

  const adjustment = await tx.kitchenTicketAdjustment.create({
    data: {
      kitchenTicketId: targetTicketItem.kitchenTicketId,
      kitchenTicketItemId: targetTicketItem.id,
      accountItemId,
      productName: accountItem.productName,
      previousQuantity: effectiveQuantity,
      newQuantity,
      quantityDelta,
    },
  });

  await tx.accountItem.update({
    where: { id: accountItemId },
    data: { quantity: newQuantity, subtotal: newQuantity * accountItem.price },
  });
  const remainingItems = await tx.accountItem.findMany({ where: { accountId } });
  await tx.account.update({
    where: { id: accountId },
    data: { total: remainingItems.reduce((total, item) => total + item.subtotal, 0) },
  });

  return adjustment;
});

export const acknowledgeKitchenTicketAdjustmentService = async (id: number) => {
  const adjustment = await prisma.kitchenTicketAdjustment.findUnique({ where: { id } });
  if (!adjustment) throw new Error("Kitchen ticket adjustment not found");
  if (adjustment.status === "ACKNOWLEDGED") return adjustment;
  return prisma.kitchenTicketAdjustment.update({
    where: { id },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
  });
};
