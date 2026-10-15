import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import { countPhase, validateCount, assertSnapshot } from "./shiftInventory.rules";
import { applyInventoryMovementTx } from "./inventoryLot.service";
import { lockInventoryVerificationTx } from "./inventoryVerificationLock";
import { inventoryCountPolicyForGroup } from "../config/operationScope";

type CountDatabase = Pick<typeof prisma, "$transaction">;

const eligibleInventories = async (tx: Prisma.TransactionClient, storeId: number) => {
  const store = await tx.store.findUniqueOrThrow({ where: { id: storeId } });
  return tx.storeInventory.findMany({
    where: { storeId, isInitialized: true, productVariant: {
      product: { productType: { in: ["FINISHED_PRODUCT", "THIRD_PARTY_PRODUCT"] } },
      OR: [{ catalogItems: { some: { groupId: store.groupId } } }, { storeInventories: { some: { storeId, stock: { not: 0 } } } }],
    } },
    include: { productVariant: { include: { product: true } } },
    orderBy: { productVariantId: "asc" },
  });
};

const revision = async (tx: Prisma.TransactionClient, storeId: number, productVariantId: number) => {
  const result = await tx.inventoryTransaction.aggregate({ where: { storeId, productVariantId }, _max: { id: true } });
  return result._max.id ?? 0;
};

const lockRegister = async (tx: Prisma.TransactionClient, id: number, storeId: number) => {
  await tx.$queryRaw`SELECT "id" FROM "CashRegister" WHERE "id" = ${id} FOR UPDATE`;
  const register = await tx.cashRegister.findFirst({
    where: { id, terminal: { storeId } },
    include: { terminal: { include: { store: { include: { group: true } } } } },
  });
  if (!register) throw new Error("El turno no pertenece al punto activo.");
  return register;
};

const lockInventory = async (tx: Prisma.TransactionClient, storeId: number, productVariantId: number) => {
  await tx.$queryRaw`SELECT "id" FROM "StoreInventory" WHERE "storeId" = ${storeId} AND "productVariantId" = ${productVariantId} FOR UPDATE`;
};

export const getShiftInventory = async (id: number, storeId: number, database: CountDatabase = prisma) => database.$transaction(async tx => {
  const register = await tx.cashRegister.findFirst({ where: { id, terminal: { storeId } } });
  if (!register) throw new Error("Turno no disponible en este punto.");
  const store = await tx.store.findUniqueOrThrow({
    where: { id: storeId },
    include: { group: { select: { code: true } } },
  });
  const inventories = await eligibleInventories(tx, storeId);
  const movements = await tx.inventoryTransaction.groupBy({ by: ["productVariantId"], where: { storeId }, _max: { id: true } });
  const revisions = new Map(movements.map(item => [item.productVariantId, item._max.id ?? 0]));
  const counts = await tx.shiftInventoryCount.findMany({ where: { cashRegisterId: id }, include: { confirmedByUser: { select: { name: true } }, items: { orderBy: { productVariantId: "asc" }, include: { countedByUser: { select: { name: true } }, resolvedByUser: { select: { name: true } } } } } });
  const lastCompleteCount = await tx.shiftInventoryCount.findFirst({
    where: {
      confirmedAt: { not: null },
      cashRegister: { terminal: { storeId } },
      cashRegisterId: { not: id },
    },
    orderBy: { confirmedAt: "desc" },
    select: { confirmedAt: true, phase: true, cashRegisterId: true },
  });
  return {
    register,
    counts,
    policy: inventoryCountPolicyForGroup(store.group.code),
    lastCompleteCount,
    products: inventories.map(inventory => ({
      productVariantId: inventory.productVariantId,
      productName: `${inventory.productVariant.product.name} / ${inventory.productVariant.name}`,
      unit: inventory.productVariant.unit, expectedQuantity: inventory.stock,
      movementRevision: revisions.get(inventory.productVariantId) ?? 0,
    })),
  };
}, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

export const saveShiftInventoryItem = async (id: number, storeId: number, userId: number, data: {
  phase?: unknown; productVariantId?: unknown; countedQuantity?: unknown;
  expectedQuantity?: unknown; movementRevision?: unknown; justification?: unknown;
}, database: CountDatabase = prisma) => database.$transaction(async tx => {
  await lockInventoryVerificationTx(tx);
  const phase = countPhase(data.phase);
  const register = await lockRegister(tx, id, storeId);
  if (register.status !== "OPEN") throw new Error("El turno ya está cerrado.");
  if (typeof data.productVariantId !== "number" || !Number.isSafeInteger(data.productVariantId)) throw new Error("Producto inválido.");
  const key = { cashRegisterId: id, phase };
  const count = await tx.shiftInventoryCount.upsert({ where: { cashRegisterId_phase: key }, create: key, update: {} });
  if (count.confirmedAt) throw new Error("Este conteo ya está confirmado; su evidencia no se puede editar.");
  const policy = inventoryCountPolicyForGroup(register.terminal.store.group.code);
  if (phase === "CLOSING" && policy === "STRICT") {
    const opening = await tx.shiftInventoryCount.findUnique({ where: { cashRegisterId_phase: { cashRegisterId: id, phase: "OPENING" } } });
    if (!opening?.confirmedAt) throw new Error("Completa y confirma el conteo inicial primero.");
  }
  await lockInventory(tx, storeId, data.productVariantId);
  const inventory = (await eligibleInventories(tx, storeId)).find(item => item.productVariantId === data.productVariantId);
  if (!inventory) throw new Error("Este producto no está disponible para el conteo del punto.");
  const movementRevision = await revision(tx, storeId, inventory.productVariantId);
  assertSnapshot(data.expectedQuantity, data.movementRevision, inventory.stock, movementRevision);
  const values = validateCount(data.countedQuantity, inventory.stock, data.justification);
  const item = {
    productVariantId: inventory.productVariantId,
    productName: `${inventory.productVariant.product.name} / ${inventory.productVariant.name}`,
    unit: inventory.productVariant.unit, expectedQuantity: inventory.stock,
    movementRevision, ...values, countedAt: new Date(), countedByUserId: userId,
  };
  return tx.shiftInventoryCountItem.upsert({ where: { countId_productVariantId: { countId: count.id, productVariantId: inventory.productVariantId } }, create: { countId: count.id, ...item }, update: item });
});

const assertComplete = async (tx: Prisma.TransactionClient, id: number, storeId: number, phase: string) => {
  await tx.$queryRaw`SELECT "id" FROM "StoreInventory" WHERE "storeId" = ${storeId} ORDER BY "id" FOR UPDATE`;
  const count = await tx.shiftInventoryCount.findUnique({ where: { cashRegisterId_phase: { cashRegisterId: id, phase } }, include: { items: true } });
  const inventories = await eligibleInventories(tx, storeId);
  const movements = await tx.inventoryTransaction.groupBy({ by: ["productVariantId"], where: { storeId }, _max: { id: true } });
  const revisions = new Map(movements.map(item => [item.productVariantId, item._max.id ?? 0]));
  for (const inventory of inventories) {
    const item = count?.items.find(item => item.productVariantId === inventory.productVariantId);
    if (!item) throw new Error(`Falta contar ${inventory.productVariant.product.name} / ${inventory.productVariant.name}.`);
    if (phase === "CLOSING") {
      try { assertSnapshot(item.expectedQuantity, item.movementRevision, inventory.stock, revisions.get(inventory.productVariantId) ?? 0); }
      catch { throw new Error(`Hay movimientos posteriores al conteo final de ${item.productName}. Vuelve a verificarlo.`); }
    }
  }
  return count;
};

export const confirmShiftInventory = async (id: number, storeId: number, userId: number, value: unknown, database: CountDatabase = prisma) => database.$transaction(async tx => {
  await lockInventoryVerificationTx(tx);
  const phase = countPhase(value);
  const register = await lockRegister(tx, id, storeId);
  if (register.status !== "OPEN") throw new Error("El turno ya está cerrado.");
  const policy = inventoryCountPolicyForGroup(register.terminal.store.group.code);
  if (phase === "CLOSING" && policy === "STRICT") {
    const opening = await tx.shiftInventoryCount.findUnique({ where: { cashRegisterId_phase: { cashRegisterId: id, phase: "OPENING" } } });
    if (!opening?.confirmedAt) throw new Error("Confirma el conteo inicial primero.");
  }
  const count = await assertComplete(tx, id, storeId, phase);
  if (count?.confirmedAt) return count;
  return tx.shiftInventoryCount.upsert({
    where: { cashRegisterId_phase: { cashRegisterId: id, phase } },
    create: { cashRegisterId: id, phase, confirmedAt: new Date(), confirmedByUserId: userId },
    update: { confirmedAt: new Date(), confirmedByUserId: userId },
  });
});

export const requireShiftInventoryClosing = async (tx: Prisma.TransactionClient, id: number, storeId: number) => {
  const opening = await tx.shiftInventoryCount.findUnique({ where: { cashRegisterId_phase: { cashRegisterId: id, phase: "OPENING" } } });
  const closing = await tx.shiftInventoryCount.findUnique({ where: { cashRegisterId_phase: { cashRegisterId: id, phase: "CLOSING" } } });
  if (!opening?.confirmedAt || !closing?.confirmedAt) throw new Error("Debes completar y confirmar el conteo inicial y final antes de cerrar el turno.");
  await assertComplete(tx, id, storeId, "CLOSING");
};

export const reopenFinalCount = async (id: number, storeId: number, database: CountDatabase = prisma) => database.$transaction(async tx => {
  await lockInventoryVerificationTx(tx);
  const register = await lockRegister(tx, id, storeId);
  if (register.status !== "OPEN") throw new Error("El turno ya está cerrado.");
  const count = await tx.shiftInventoryCount.findUnique({ where: { cashRegisterId_phase: { cashRegisterId: id, phase: "CLOSING" } }, include: { items: true } });
  if (!count?.confirmedAt) return;
  const archive = Array.isArray(count.archivedVerifications) ? count.archivedVerifications : [];
  const snapshot = JSON.parse(JSON.stringify({ confirmedAt: count.confirmedAt, confirmedByUserId: count.confirmedByUserId, items: count.items }));
  await tx.shiftInventoryCount.update({ where: { id: count.id }, data: {
    confirmedAt: null, confirmedByUserId: null, archivedVerifications: [...archive, snapshot],
  } });
  // Preserve unaffected rows; changed rows are explicitly verified again.
});

export const resolveShiftInventoryItem = async (itemId: number, storeId: number, userId: number, data: {
  resolution?: unknown; reason?: unknown; expectedQuantity?: unknown; movementRevision?: unknown;
}, database: CountDatabase = prisma) => database.$transaction(async tx => {
  await lockInventoryVerificationTx(tx);
  await tx.$queryRaw`SELECT "id" FROM "ShiftInventoryCountItem" WHERE "id" = ${itemId} FOR UPDATE`;
  const item = await tx.shiftInventoryCountItem.findFirst({ where: { id: itemId, count: { cashRegister: { terminal: { storeId } } } }, include: { count: true } });
  if (!item || !item.count.confirmedAt || !item.difference) throw new Error("Diferencia no disponible para revisión.");
  const countRegister = await tx.cashRegister.findUniqueOrThrow({ where: { id: item.count.cashRegisterId } });
  if (countRegister.status !== "CLOSED") throw new Error("Cierra el turno antes de revisar las diferencias.");
  if (item.resolution) throw new Error("Esta diferencia ya fue resuelta.");
  if (!["ADJUSTMENT", "EXPLAINED", "COUNT_ERROR"].includes(String(data.resolution))) throw new Error("Resolución inválida.");
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (!reason || reason.length > 2000) throw new Error("Indica el motivo de la resolución (máximo 2000 caracteres).");
  let operationId: string | null = null;
  if (data.resolution === "ADJUSTMENT") {
    if (item.count.phase !== "CLOSING") throw new Error("Los ajustes se realizan sobre el conteo final para no duplicar diferencias de apertura.");
    const register = await tx.cashRegister.findUniqueOrThrow({ where: { id: item.count.cashRegisterId } });
    if (register.status !== "CLOSED") throw new Error("Cierra el turno antes de aplicar un ajuste.");
    await lockInventory(tx, storeId, item.productVariantId);
    const inventory = await tx.storeInventory.findUniqueOrThrow({ where: { storeId_productVariantId: { storeId, productVariantId: item.productVariantId } } });
    const currentRevision = await revision(tx, storeId, item.productVariantId);
    assertSnapshot(data.expectedQuantity, data.movementRevision, inventory.stock, currentRevision);
    // A later movement may already explain/correct the discrepancy. Require a
    // fresh manual reconciliation rather than applying an old delta blindly.
    assertSnapshot(item.expectedQuantity, item.movementRevision, inventory.stock, currentRevision);
    const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.productVariantId } });
    operationId = randomUUID();
    await applyInventoryMovementTx(tx, { storeId, productVariantId: item.productVariantId, quantity: item.difference,
      unit: variant.unit, type: "ADJUSTMENT", createdByUserId: userId, operationId,
      observation: `Conteo de turno #${item.count.cashRegisterId}: ${reason}` });
  }
  return tx.shiftInventoryCountItem.update({ where: { id: item.id }, data: {
    resolution: String(data.resolution), resolutionReason: reason, resolvedAt: new Date(), resolvedByUserId: userId, adjustmentOperationId: operationId,
  } });
});
