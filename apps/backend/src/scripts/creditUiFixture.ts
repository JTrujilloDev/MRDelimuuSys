import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { applyInventoryMovementTx } from "../service/inventoryLot.service";
import { getShiftInventory, saveShiftInventoryItem, confirmShiftInventory } from "../service/shiftInventory.service";

// Explicit, local-only browser QA fixture. Never run against a production host.
const run = async () => {
  if (process.env.RUN_UI_TESTS !== "true" || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Solo pruebas locales explícitas");
  const mode = process.argv[2];
  if (mode === "create") {
    const token = randomUUID();
    const password = await bcrypt.hash("QaCreditos2026!", 10);
    const fixture = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: "QA Créditos", email: `${token}@qa-credits.test`, password, role: "CASHIER" } });
      const group = await tx.storeGroup.create({ data: { code: `QA-CREDITS-${token}`, name: "QA Créditos" } });
      const store = await tx.store.create({ data: { code: `QA-CREDITS-${token}`, name: "QA Créditos", groupId: group.id } });
      const terminal = await tx.terminal.create({ data: { code: "QA", name: "Terminal de pruebas", storeId: store.id } });
      await tx.userStoreAccess.create({ data: { userId: user.id, storeId: store.id, role: "CASHIER" } });
      const category = await tx.category.create({ data: { name: `QA Créditos ${token}`, posVisible: true } });
      const product = await tx.product.create({ data: { name: "Producto de prueba crédito", categoryId: category.id } });
      const variant = await tx.productVariant.create({ data: { name: "Unidad", productId: product.id } });
      await tx.groupCatalogItem.create({ data: { groupId: group.id, productVariantId: variant.id, salePrice: 20000, costPrice: 5000 } });
      await applyInventoryMovementTx(tx, { storeId: store.id, productVariantId: variant.id, quantity: 3, unit: "UNIT", type: "INITIAL", initializesInventory: true });
      const register = await tx.cashRegister.create({ data: { userId: user.id, terminalId: terminal.id, openingAmount: 0, openedAt: new Date() } });
      await tx.financialTransaction.create({ data: { type: "OPENING", amount: 0, relatedCashRegisterId: register.id } });
      const database = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
      const item = (await getShiftInventory(register.id, store.id, database)).products[0];
      await saveShiftInventoryItem(register.id, store.id, user.id, { phase: "OPENING", ...item, countedQuantity: item.expectedQuantity }, database);
      await confirmShiftInventory(register.id, store.id, user.id, "OPENING", database);
      const account = await tx.account.create({ data: { name: "Cuenta prueba crédito", userId: user.id, terminalId: terminal.id, accountItems: { create: { productVariantId: variant.id, productName: product.name, quantity: 1, price: 20000, subtotal: 20000 } } } });
      return { token, email: user.email, storeId: store.id, cashRegisterId: register.id, accountId: account.id };
    });
    console.log(JSON.stringify(fixture));
    return;
  }
  if (mode !== "cleanup") throw new Error("Usa create o cleanup con el token de la prueba");
  const token = process.argv[3];
  if (!/^[a-f0-9-]{36}$/.test(token || "")) throw new Error("Token de prueba inválido");
  await prisma.$transaction(async tx => {
    const group = await tx.storeGroup.findUniqueOrThrow({ where: { code: `QA-CREDITS-${token}` }, include: { stores: true } });
    const user = await tx.user.findUniqueOrThrow({ where: { email: `${token}@qa-credits.test` } });
    if (group.stores.length !== 1 || group.stores[0].code !== group.code) throw new Error("La prueba fue modificada; no se elimina automáticamente");
    const storeId = group.stores[0].id;
    const registers = await tx.cashRegister.findMany({ where: { terminal: { storeId } } });
    const registerIds = registers.map(item => item.id);
    const accounts = await tx.account.findMany({ where: { terminal: { storeId } } });
    if (accounts.some(item => item.userId !== user.id) || await tx.account.count({ where: { userId: user.id, terminal: { storeId: { not: storeId } } } })) throw new Error("Hay actividad externa a la prueba");
    const customerIds = accounts.flatMap(item => item.customerId ? [item.customerId] : []);
    if (customerIds.length && await tx.account.count({ where: { customerId: { in: customerIds }, terminal: { storeId: { not: storeId } } } })) throw new Error("Cliente compartido fuera de la prueba");
    const category = await tx.category.findFirstOrThrow({ where: { name: `QA Créditos ${token}` } });
    const products = await tx.product.findMany({ where: { categoryId: category.id }, include: { variants: true } });
    const variantIds = products.flatMap(item => item.variants.map(variant => variant.id));
    if (await tx.groupCatalogItem.count({ where: { productVariantId: { in: variantIds }, groupId: { not: group.id } } })) throw new Error("Producto compartido fuera de la prueba");
    await tx.userSession.deleteMany({ where: { userId: user.id } });
    await tx.notificationOutbox.deleteMany({ where: { OR: registerIds.map(id => ({ deduplicationKey: { startsWith: `shift:${id}:` } })) } });
    await tx.shiftInventoryCountItem.deleteMany({ where: { count: { cashRegisterId: { in: registerIds } } } });
    await tx.shiftInventoryCount.deleteMany({ where: { cashRegisterId: { in: registerIds } } });
    await tx.financialTransaction.deleteMany({ where: { relatedCashRegisterId: { in: registerIds } } });
    await tx.inventoryTransaction.deleteMany({ where: { storeId } });
    await tx.storeLotInventory.deleteMany({ where: { storeId } });
    await tx.storeInventory.deleteMany({ where: { storeId } });
    await tx.stockNotificationState.deleteMany({ where: { storeId } });
    await tx.account.deleteMany({ where: { terminal: { storeId } } });
    await tx.cashRegister.deleteMany({ where: { id: { in: registerIds } } });
    await tx.userStoreAccess.deleteMany({ where: { storeId } });
    await tx.terminal.deleteMany({ where: { storeId } });
    await tx.store.delete({ where: { id: storeId } });
    await tx.groupCatalogItem.deleteMany({ where: { groupId: group.id } });
    await tx.storeGroup.delete({ where: { id: group.id } });
    await tx.product.deleteMany({ where: { categoryId: category.id } });
    await tx.category.delete({ where: { id: category.id } });
    await tx.customer.deleteMany({ where: { id: { in: customerIds } } });
    await tx.user.delete({ where: { id: user.id } });
  });
  console.log("Datos aislados de prueba eliminados");
};
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
