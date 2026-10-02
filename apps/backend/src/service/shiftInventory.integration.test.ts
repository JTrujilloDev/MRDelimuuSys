import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { applyInventoryMovementTx } from "./inventoryLot.service";
import { closeCashRegisterService } from "./cashRegister.service";
import { getShiftInventory, saveShiftInventoryItem, confirmShiftInventory, requireShiftInventoryClosing, reopenFinalCount, resolveShiftInventoryItem } from "./shiftInventory.service";

const enabled = process.env.RUN_DB_TESTS === "true";
after(async () => { if (enabled) await prisma.$disconnect(); });

test("shift counts: snapshots, sale race, scope, closure, archive and exactly-once lot adjustment", { skip: !enabled }, async () => {
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  try {
    await prisma.$transaction(async tx => {
      const suffix = randomUUID();
      const user = await tx.user.create({ data: { name: "Prueba conteo", email: `${suffix}@count.test`, password: "not-a-login" } });
      const group = await tx.storeGroup.create({ data: { code: suffix, name: "Prueba conteo" } });
      const store = await tx.store.create({ data: { code: suffix, name: "Prueba conteo", groupId: group.id } });
      const terminal = await tx.terminal.create({ data: { code: "TEST", name: "Prueba", storeId: store.id } });
      const register = await tx.cashRegister.create({ data: { userId: user.id, terminalId: terminal.id, openingAmount: 0, openedAt: new Date() } });
      const category = await tx.category.create({ data: { name: "Prueba conteo" } });
      const product = await tx.product.create({ data: { name: "Producto conteo", categoryId: category.id } });
      const variant = await tx.productVariant.create({ data: { name: "Unidad", productId: product.id, isActive: false } });
      await tx.groupCatalogItem.create({ data: { groupId: group.id, productVariantId: variant.id, costPrice: 2, isPosActive: false } });
      await applyInventoryMovementTx(tx, { storeId: store.id, productVariantId: variant.id, quantity: 10, unit: "UNIT", type: "INITIAL", initializesInventory: true });
      const ingredient = await tx.product.create({ data: { name: "Ingrediente excluido", categoryId: category.id, productType: "INGREDIENT" } });
      const ingredientVariant = await tx.productVariant.create({ data: { name: "Gramos", productId: ingredient.id } });
      await applyInventoryMovementTx(tx, { storeId: store.id, productVariantId: ingredientVariant.id, quantity: 10, unit: "UNIT", type: "INITIAL", initializesInventory: true });
      // Service calls share this rollback-only transaction; no fixtures persist.
      const database = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
      const read = () => getShiftInventory(register.id, store.id, database);
      const save = (phase: string, snapshot: { productVariantId: number; expectedQuantity: number; movementRevision: number }, quantity: number, justification = "") => saveShiftInventoryItem(register.id, store.id, user.id, { phase, ...snapshot, countedQuantity: quantity, justification }, database);
      const confirm = (phase: string) => confirmShiftInventory(register.id, store.id, user.id, phase, database);
      assert.deepEqual((await read()).products.map(item => item.productVariantId), [variant.id]);
      await assert.rejects(getShiftInventory(register.id, -1, database), /Turno no disponible/);
      await assert.rejects(confirm("OPENING"), /Falta contar/);
      await assert.rejects(requireShiftInventoryClosing(tx, register.id, store.id), /conteo inicial y final/);
      await assert.rejects(closeCashRegisterService(register.id, 0, "", database), /conteo inicial y final/);
      const original = (await read()).products[0];
      await applyInventoryMovementTx(tx, { storeId: store.id, productVariantId: variant.id, quantity: -1, unit: "UNIT", type: "SALE" });
      await assert.rejects(save("OPENING", original, 9), /inventario cambió/);
      const afterSale = (await read()).products[0];
      await save("OPENING", afterSale, 9);
      await confirm("OPENING");
      await assert.rejects(save("OPENING", afterSale, 9), /ya está confirmado/);
      await assert.rejects(save("CLOSING", afterSale, 8), /Justifica/);
      await save("CLOSING", afterSale, 8, "Faltante físico");
      await confirm("CLOSING");
      await requireShiftInventoryClosing(tx, register.id, store.id);
      // A late receipt invalidates the final snapshot, even with a confirmed header.
      await applyInventoryMovementTx(tx, { storeId: store.id, productVariantId: variant.id, quantity: 1, unit: "UNIT", type: "PURCHASE" });
      await assert.rejects(requireShiftInventoryClosing(tx, register.id, store.id), /movimientos posteriores/);
      await reopenFinalCount(register.id, store.id, database);
      const archive = (await read()).counts.find(item => item.phase === "CLOSING")!.archivedVerifications;
      assert.ok(Array.isArray(archive));
      assert.equal(archive.length, 1);
      const current = (await read()).products[0];
      await save("CLOSING", current, 9, "Faltante físico confirmado");
      await confirm("CLOSING");
      await requireShiftInventoryClosing(tx, register.id, store.id);
      await closeCashRegisterService(register.id, 0, "", database);
      assert.equal((await read()).register.status, "CLOSED");
      const item = (await read()).counts.find(item => item.phase === "CLOSING")!.items[0];
      const resolution = { resolution: "ADJUSTMENT", reason: "Verificado por administrador", expectedQuantity: current.expectedQuantity, movementRevision: current.movementRevision };
      await resolveShiftInventoryItem(item.id, store.id, user.id, resolution, database);
      assert.equal((await read()).products[0].expectedQuantity, 9);
      const lots = await tx.storeLotInventory.aggregate({ where: { storeId: store.id, inventoryLot: { productVariantId: variant.id } }, _sum: { stock: true } });
      assert.equal(lots._sum.stock, 9);
      await assert.rejects(resolveShiftInventoryItem(item.id, store.id, user.id, resolution, database), /ya fue resuelta/);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
});
