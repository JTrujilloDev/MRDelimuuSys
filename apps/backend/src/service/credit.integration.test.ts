import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { closeAccountService, cancelClosedAccountService } from "./accounts.service";
import { listCredits, registerCreditPayment, voidCreditPayment } from "./credit.service";
import { getOpenCashRegisterService, closeCashRegisterService, getCashRegisterHistoryService } from "./cashRegister.service";
import { applyInventoryMovementTx } from "./inventoryLot.service";
import { getShiftInventory, saveShiftInventoryItem, confirmShiftInventory } from "./shiftInventory.service";

const enabled = process.env.RUN_DB_TESTS === "true";
after(async () => { if (enabled) await prisma.$disconnect(); });

test("créditos: venta, inventario, abonos, anulación, aislamiento y cierre en otro turno (rollback)", { skip: !enabled }, async () => {
  const rollback = new Error("ROLLBACK_CREDIT_TEST");
  const oldPush = process.env.NOTIFICATIONS_PUSH_ENABLED;
  const oldEmail = process.env.NOTIFICATIONS_EMAIL_ENABLED;
  process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
  process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";
  try {
    await prisma.$transaction(async tx => {
      const suffix = randomUUID();
      const user = await tx.user.create({ data: { name: "Prueba créditos", email: `${suffix}@credits.test`, password: "not-a-login" } });
      const group = await tx.storeGroup.create({ data: { code: suffix, name: "Prueba créditos" } });
      const store = await tx.store.create({ data: { code: suffix, name: "Prueba créditos", groupId: group.id } });
      const otherStore = await tx.store.create({ data: { code: `${suffix}-other`, name: "Otro punto", groupId: group.id } });
      const terminal = await tx.terminal.create({ data: { code: "TEST", name: "Prueba", storeId: store.id } });
      const firstShift = await tx.cashRegister.create({ data: { userId: user.id, terminalId: terminal.id, openingAmount: 10000, openedAt: new Date() } });
      await tx.financialTransaction.create({ data: { type: "OPENING", amount: 10000, relatedCashRegisterId: firstShift.id } });
      const category = await tx.category.create({ data: { name: "Prueba créditos" } });
      const product = await tx.product.create({ data: { name: "Producto crédito", categoryId: category.id } });
      const variant = await tx.productVariant.create({ data: { name: "Unidad", productId: product.id } });
      await tx.groupCatalogItem.create({ data: { groupId: group.id, productVariantId: variant.id, salePrice: 20000, costPrice: 5000 } });
      await applyInventoryMovementTx(tx, { storeId: store.id, productVariantId: variant.id, quantity: 3, unit: "UNIT", type: "INITIAL", initializesInventory: true });
      const database = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
      const confirm = async (registerId: number, phase: string) => {
        const snapshot = (await getShiftInventory(registerId, store.id, database)).products[0];
        await saveShiftInventoryItem(registerId, store.id, user.id, { phase, ...snapshot, countedQuantity: snapshot.expectedQuantity }, database);
        await confirmShiftInventory(registerId, store.id, user.id, phase, database);
      };
      await confirm(firstShift.id, "OPENING");
      const cancelledCredit = await tx.account.create({ data: { name: "Crédito a anular", userId: user.id, terminalId: terminal.id,
        accountItems: { create: { productVariantId: variant.id, productName: product.name, quantity: 1, price: 20000, subtotal: 20000, unitCost: 5000 } } } });
      await closeAccountService({ accountId: cancelledCredit.id, cashRegisterId: firstShift.id, paymentMethod: "CREDIT",
        creditCustomer: { name: "Cliente anulación", phone: "0000000000" } }, database);
      await cancelClosedAccountService({ accountId: cancelledCredit.id, reason: "Venta registrada por error", cancelledByUserId: user.id, activeTerminalId: terminal.id }, database);
      assert.equal((await listCredits(store.id, tx as unknown as Pick<typeof prisma, "account">))[0].status, "CANCELLED");
      assert.equal((await tx.storeInventory.findUniqueOrThrow({ where: { storeId_productVariantId: { storeId: store.id, productVariantId: variant.id } } })).stock, 3);
      const account = await tx.account.create({ data: { name: "Venta fiada", userId: user.id, terminalId: terminal.id,
        accountItems: { create: { productVariantId: variant.id, productName: product.name, quantity: 1, price: 20000, subtotal: 20000, unitCost: 5000 } } } });
      const closing = { accountId: account.id, cashRegisterId: firstShift.id, paymentMethod: "CREDIT" as const, discount: 2000, discountObservation: "Cliente frecuente", creditCustomer: { name: "Cliente de prueba", phone: "3001234567" } };
      await assert.rejects(closeAccountService({ ...closing, creditCustomer: undefined }, database), /nombre del cliente/);
      await closeAccountService(closing, database);
      await assert.rejects(closeAccountService(closing, database), /already closed/);
      const read = () => getOpenCashRegisterService(terminal.id, tx as unknown as Pick<typeof prisma, "cashRegister">);
      const credits = () => listCredits(store.id, tx as unknown as Pick<typeof prisma, "account">);
      assert.equal((await read())!.expectedCash, 10000);
      assert.equal((await read())!.creditAmount, 18000);
      assert.equal((await credits())[0].balance, 18000);
      assert.equal((await credits())[0].customer?.name, "Cliente de prueba");
      assert.equal((await tx.storeInventory.findUniqueOrThrow({ where: { storeId_productVariantId: { storeId: store.id, productVariantId: variant.id } } })).stock, 2);
      const paymentInput = { accountId: account.id, storeId: store.id, terminalId: terminal.id, cashRegisterId: firstShift.id, userId: user.id, amount: 5000, paymentMethod: "CASH", requestKey: randomUUID() };
      await assert.rejects(registerCreditPayment({ ...paymentInput, amount: 18001 }, database), /supera/);
      await assert.rejects(registerCreditPayment({ ...paymentInput, storeId: otherStore.id }, database), /turno/);
      const cash = await registerCreditPayment(paymentInput, database);
      await registerCreditPayment(paymentInput, database); // Retry must not double the receipt.
      assert.equal((await credits())[0].payments.length, 1);
      assert.equal((await read())!.expectedCash, 15000);
      await registerCreditPayment({ ...paymentInput, amount: 3000, paymentMethod: "QR", requestKey: randomUUID() }, database);
      await registerCreditPayment({ ...paymentInput, amount: 2000, paymentMethod: "CARD", requestKey: randomUUID() }, database);
      assert.equal((await read())!.totalSales, 18000);
      assert.equal((await read())!.creditCollections, 10000);
      assert.equal((await read())!.expectedCash, 15000);
      await assert.rejects(cancelClosedAccountService({ accountId: account.id, reason: "Prueba", cancelledByUserId: user.id, activeTerminalId: terminal.id }, database), /ya tiene abonos/);
      const voidInput = { ...paymentInput, paymentId: cash.payment.id, reason: "Abono equivocado" };
      await voidCreditPayment(voidInput, database);
      await assert.rejects(voidCreditPayment(voidInput, database), /ya fue anulado/);
      assert.equal((await credits())[0].balance, 13000);
      assert.equal((await read())!.expectedCash, 10000);
      assert.equal((await read())!.creditCollections, 5000);
      assert.deepEqual(await listCredits(otherStore.id, tx as unknown as Pick<typeof prisma, "account">), []);
      await confirm(firstShift.id, "CLOSING");
      await closeCashRegisterService(firstShift.id, 10000, "", database, 10000);
      await assert.rejects(registerCreditPayment({ ...paymentInput, requestKey: randomUUID() }, database), /turno/);
      const secondShift = await tx.cashRegister.create({ data: { userId: user.id, terminalId: terminal.id, openingAmount: 0, openedAt: new Date() } });
      await confirm(secondShift.id, "OPENING");
      await registerCreditPayment({ ...paymentInput, cashRegisterId: secondShift.id, amount: 13000, requestKey: randomUUID() }, database);
      assert.equal((await credits())[0].status, "PAID");
      assert.equal((await credits())[0].balance, 0);
      assert.equal((await read())!.totalSales, 0);
      assert.equal((await read())!.expectedCash, 13000);
      assert.equal((await read())!.creditCollections, 13000);
      await assert.rejects(voidCreditPayment({ ...voidInput, cashRegisterId: secondShift.id }, database), /turno activo/);
      await assert.rejects(registerCreditPayment({ ...paymentInput, cashRegisterId: secondShift.id, amount: 1, requestKey: randomUUID() }, database), /supera/);
      await confirm(secondShift.id, "CLOSING");
      await closeCashRegisterService(secondShift.id, 13000, "", database, 13000);
      const history = await getCashRegisterHistoryService(new Date("2020-01-01"), new Date("2100-01-01"), store.id, user.id, true, tx as unknown as Pick<typeof prisma, "cashRegister" | "accountItem">);
      const secondHistory = history.cashRegisters.find(item => item.id === secondShift.id)!;
      assert.equal(secondHistory.totalSales, 0);
      assert.equal(secondHistory.creditCollections, 13000);
      assert.equal(secondHistory.difference, 0);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally {
    for (const [key, value] of [["NOTIFICATIONS_PUSH_ENABLED", oldPush], ["NOTIFICATIONS_EMAIL_ENABLED", oldEmail]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
