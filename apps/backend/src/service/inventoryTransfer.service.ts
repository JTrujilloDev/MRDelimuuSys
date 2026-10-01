import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { applyInventoryMovementTx } from "./inventoryLot.service";
import {
  normalizeDispatchTransferItems,
  normalizeReceiveTransferItems,
  normalizeTransferObservation,
  requireTransferCancellationReason,
  requireTransferDiscrepancyReason,
} from "./inventoryTransfer.rules";

const transferInclude = {
  originStore: { select: { id: true, name: true } },
  destinationStore: { select: { id: true, name: true } },
  dispatchedByUser: { select: { id: true, name: true } },
  receivedByUser: { select: { id: true, name: true } },
  cancelledByUser: { select: { id: true, name: true } },
  items: {
    include: {
      productVariant: { include: { product: { select: { id: true, name: true } } } },
      inventoryLot: true,
    },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.InventoryTransferInclude;

export const getInventoryTransferDestinationsService = async (storeId: number) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { groupId: true },
  });
  if (!store) throw new Error("Store not found");
  return prisma.store.findMany({
    where: { groupId: store.groupId, isActive: true, id: { not: storeId } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};

export const getInventoryTransfersService = async (storeId: number) =>
  prisma.inventoryTransfer.findMany({
    where: { OR: [{ originStoreId: storeId }, { destinationStoreId: storeId }] },
    include: transferInclude,
    orderBy: { dispatchedAt: "desc" },
    take: 100,
  });

export const createInventoryTransferService = async (
  data: { destinationStoreId?: unknown; observation?: unknown; items?: unknown },
  originStoreId: number,
  userId: number,
) => {
  const destinationStoreId = Number(data.destinationStoreId);
  if (!Number.isInteger(destinationStoreId) || destinationStoreId <= 0) {
    throw new Error("A valid destination store is required");
  }
  if (destinationStoreId === originStoreId) {
    throw new Error("Origin and destination stores must be different");
  }
  const items = normalizeDispatchTransferItems(data.items);
  const observation = normalizeTransferObservation(data.observation);

  return prisma.$transaction(async (tx) => {
    const [origin, destination] = await Promise.all([
      tx.store.findUnique({ where: { id: originStoreId }, select: { groupId: true, isActive: true } }),
      tx.store.findUnique({ where: { id: destinationStoreId }, select: { groupId: true, isActive: true } }),
    ]);
    if (!origin?.isActive || !destination?.isActive) throw new Error("Origin or destination store is inactive");
    if (origin.groupId !== destination.groupId) {
      throw new Error("Transfers are only allowed between stores in the same business group");
    }

    const variants = await tx.productVariant.findMany({
      where: { id: { in: items.map((item) => item.productVariantId) }, isActive: true },
      include: {
        product: true,
        catalogItems: { where: { groupId: origin.groupId } },
        storeInventories: { where: { storeId: originStoreId } },
      },
    });
    if (variants.length !== items.length) throw new Error("One or more product variants were not found");
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    const transfer = await tx.inventoryTransfer.create({
      data: {
        groupId: origin.groupId,
        originStoreId,
        destinationStoreId,
        dispatchedByUserId: userId,
        dispatchObservation: observation,
      },
    });

    for (const item of items) {
      const variant = variantsById.get(item.productVariantId);
      if (!variant || variant.product.productType === "RECIPE_PRODUCT" || variant.catalogItems.length === 0) {
        throw new Error("Product variant is not transferable in this business group");
      }
      const inventory = variant.storeInventories[0];
      if (!inventory?.isInitialized || inventory.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${variant.product.name} - ${variant.name}`);
      }

      const movements = await applyInventoryMovementTx(tx, {
        operationId: `transfer-${transfer.id}`,
        storeId: originStoreId,
        createdByUserId: userId,
        productVariantId: variant.id,
        quantity: -item.quantity,
        unit: variant.unit,
        type: "TRANSFER_OUT",
        observation: `Traslado #${transfer.id} hacia otro punto`,
        allowExpiredLots: false,
      });
      for (const movement of movements) {
        if (!movement.inventoryLotId) throw new Error("Transfer movement requires an inventory lot");
        await tx.inventoryTransferItem.create({
          data: {
            transferId: transfer.id,
            productVariantId: variant.id,
            inventoryLotId: movement.inventoryLotId,
            quantitySent: Math.abs(movement.quantity),
          },
        });
      }
    }

    return tx.inventoryTransfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include: transferInclude,
    });
  });
};

export const receiveInventoryTransferService = async (
  transferIdValue: unknown,
  data: { items?: unknown; observation?: unknown; discrepancyReason?: unknown },
  destinationStoreId: number,
  userId: number,
) => {
  const transferId = Number(transferIdValue);
  if (!Number.isInteger(transferId) || transferId <= 0) throw new Error("Traslado inválido");
  const receivedItems = normalizeReceiveTransferItems(data.items);
  const observation = normalizeTransferObservation(data.observation);

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.inventoryTransfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { productVariant: true } } },
    });
    if (!transfer) throw new Error("No se encontró el traslado");
    if (transfer.destinationStoreId !== destinationStoreId) {
      throw new Error("Transfer belongs to another destination store");
    }
    if (transfer.status !== "DISPATCHED") throw new Error("Transfer was already received");

    const receivedById = new Map(receivedItems.map((item) => [item.itemId, item]));
    if (
      receivedById.size !== transfer.items.length ||
      transfer.items.some((item) => !receivedById.has(item.id))
    ) {
      throw new Error("Every transfer item must be confirmed");
    }
    const hasDiscrepancy = transfer.items.some(
      (item) => receivedById.get(item.id)!.quantityReceived !== item.quantitySent,
    );
    const discrepancyReason = requireTransferDiscrepancyReason(
      hasDiscrepancy,
      data.discrepancyReason,
    );

    const claimed = await tx.inventoryTransfer.updateMany({
      where: { id: transferId, status: "DISPATCHED" },
      data: {
        status: "RECEIVED",
        receivedByUserId: userId,
        receivedAt: new Date(),
        receptionObservation: observation,
        discrepancyReason,
      },
    });
    if (claimed.count === 0) throw new Error("Transfer was already received");

    for (const item of transfer.items) {
      const quantityReceived = receivedById.get(item.id)!.quantityReceived;
      if (quantityReceived > 0) {
        await applyInventoryMovementTx(tx, {
          operationId: `transfer-${transfer.id}`,
          storeId: destinationStoreId,
          createdByUserId: userId,
          productVariantId: item.productVariantId,
          inventoryLotId: item.inventoryLotId,
          quantity: quantityReceived,
          unit: item.productVariant.unit,
          type: "TRANSFER_IN",
          observation: `Recepción de traslado #${transfer.id}`,
          initializesInventory: true,
        });
      }
      await tx.inventoryTransferItem.update({
        where: { id: item.id },
        data: { quantityReceived },
      });
    }

    return tx.inventoryTransfer.findUniqueOrThrow({
      where: { id: transferId },
      include: transferInclude,
    });
  });
};

export const cancelInventoryTransferService = async (
  transferIdValue: unknown,
  data: { reason?: unknown },
  originStoreId: number,
  userId: number,
) => {
  const transferId = Number(transferIdValue);
  if (!Number.isInteger(transferId) || transferId <= 0) throw new Error("Invalid transfer");
  const reason = requireTransferCancellationReason(data.reason);

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.inventoryTransfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { productVariant: true } } },
    });
    if (!transfer) throw new Error("Transfer not found");
    if (transfer.originStoreId !== originStoreId) {
      throw new Error("Solo el punto de origen puede cancelar este traslado");
    }
    if (transfer.status !== "DISPATCHED") {
      throw new Error("Solo se pueden cancelar traslados que estén en tránsito");
    }

    const claimed = await tx.inventoryTransfer.updateMany({
      where: { id: transferId, status: "DISPATCHED" },
      data: {
        status: "CANCELLED",
        cancelledByUserId: userId,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
    if (claimed.count === 0) {
      throw new Error("El traslado ya fue recibido o cancelado");
    }

    for (const item of transfer.items) {
      await applyInventoryMovementTx(tx, {
        operationId: `transfer-cancel-${transfer.id}`,
        storeId: originStoreId,
        createdByUserId: userId,
        productVariantId: item.productVariantId,
        inventoryLotId: item.inventoryLotId,
        quantity: item.quantitySent,
        unit: item.productVariant.unit,
        type: "TRANSFER_REVERSAL",
        observation: `Cancelación del traslado #${transfer.id}: ${reason}`,
      });
    }

    return tx.inventoryTransfer.findUniqueOrThrow({
      where: { id: transferId },
      include: transferInclude,
    });
  });
};
