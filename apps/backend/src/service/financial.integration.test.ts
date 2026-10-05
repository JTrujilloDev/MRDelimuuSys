import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { FinancialTransaction } from "../../generated/prisma/client";
import { createFinancialTransactionService, voidExpenseService } from "./financial.service";
import { closeCashRegisterService, getOpenCashRegisterService, getCashRegisterHistoryService } from "./cashRegister.service";
import { confirmShiftInventory } from "./shiftInventory.service";

const enabled = process.env.RUN_DB_TESTS === "true";
after(async () => { if (enabled) await prisma.$disconnect(); });

test("gastos, anulación, pantalla, cierre e historial concilian con PostgreSQL (rollback)", { skip: !enabled }, async () => {
  const rollback = new Error("ROLLBACK_FINANCIAL_TEST");
  const oldPush = process.env.NOTIFICATIONS_PUSH_ENABLED;
  const oldEmail = process.env.NOTIFICATIONS_EMAIL_ENABLED;
  process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
  process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";
  try {
    await prisma.$transaction(async tx => {
      const suffix = randomUUID();
      const user = await tx.user.create({ data: { name: "Prueba gastos", email: `${suffix}@expenses.test`, password: "not-a-login" } });
      const group = await tx.storeGroup.create({ data: { code: suffix, name: "Prueba gastos" } });
      const store = await tx.store.create({ data: { code: suffix, name: "Prueba gastos", groupId: group.id } });
      const terminal = await tx.terminal.create({ data: { code: "TEST", name: "Prueba", storeId: store.id } });
      const register = await tx.cashRegister.create({ data: { userId: user.id, terminalId: terminal.id, openingAmount: 100000, openedAt: new Date() } });
      const database = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
      await tx.financialTransaction.create({ data: { type: "OPENING", amount: 100000, relatedCashRegisterId: register.id } });
      for (const method of ["CASH", "CARD", "QR", "CREDIT"] as const) {
        const amount = method === "CASH" ? 200000 : 50000;
        const account = await tx.account.create({ data: { name: "Venta de prueba", userId: user.id, terminalId: terminal.id, cashRegisterId: register.id, status: "CLOSED", paymentMethod: method, total: amount, discount: 7000, closedAt: new Date() } });
        await tx.financialTransaction.create({ data: { type: "SALE", amount, paymentMethod: method, relatedCashRegisterId: register.id, relatedAccountId: account.id } });
      }
      const input = { type: "EXPENSE", amount: 131000, description: "Compra", adjustmentJustification: "Prueba", relatedCashRegisterId: register.id } as FinancialTransaction;
      for (const amount of [0, -1, Infinity, NaN]) await assert.rejects(createFinancialTransactionService({ ...input, amount }, database), /Invalid amount/);
      const first = await createFinancialTransactionService(input, database);
      const duplicate = await createFinancialTransactionService(input, database);
      const read = () => getOpenCashRegisterService(terminal.id, tx as unknown as Pick<typeof prisma, "cashRegister">);
      assert.equal((await read())!.expectedCash, 38000);
      await assert.rejects(voidExpenseService(first.id, -1, user.id, "Error", database), /turno cerrado/);
      await assert.rejects(voidExpenseService(duplicate.id, register.id, user.id, "", database), /motivo/);
      await voidExpenseService(duplicate.id, register.id, user.id, "Registrado dos veces", database);
      await assert.rejects(voidExpenseService(duplicate.id, register.id, user.id, "Repetir", database), /ya fue anulado/);
      assert.equal((await tx.financialTransaction.findUniqueOrThrow({ where: { id: duplicate.id } })).voidedByUserId, user.id);
      // Corrupt cached totals deliberately: the UI must derive them from the ledger.
      await tx.cashRegister.update({ where: { id: register.id }, data: { totalExpenses: 262000, cashAmount: 999999 } });
      const displayed = (await read())!;
      assert.equal(displayed.expectedCash, 169000);
      assert.equal(displayed.totalExpenses, 131000);
      assert.equal(displayed.cashAmount, 200000);
      assert.equal(displayed.totalDiscounts, 28000);
      await confirmShiftInventory(register.id, store.id, user.id, "OPENING", database);
      await confirmShiftInventory(register.id, store.id, user.id, "CLOSING", database);
      await assert.rejects(closeCashRegisterService(register.id, 168500, "Faltan 500", database, 38000), /saldo de caja cambió/);
      const result = await closeCashRegisterService(register.id, 168500, "Faltan 500", database, displayed.expectedCash);
      assert.equal(result.summary.difference, -500);
      assert.equal(result.summary.expectedCash, displayed.expectedCash);
      const history = await getCashRegisterHistoryService(new Date("2020-01-01"), new Date("2100-01-01"), store.id, user.id, true, tx as unknown as Pick<typeof prisma, "cashRegister" | "accountItem">);
      assert.equal(history.cashRegisters[0].difference, -500);
      assert.equal(history.cashRegisters[0].expectedCash, 169000);
      assert.equal(history.cashRegisters[0].totalExpenses, 131000);
      assert.equal(history.cashRegisters[0].transactions.filter(item => item.type === "EXPENSE").length, 1);
      await assert.rejects(createFinancialTransactionService(input, database), /not open/);
      await assert.rejects(voidExpenseService(first.id, register.id, user.id, "Error", database), /turno cerrado/);
      await assert.rejects(closeCashRegisterService(register.id, 168500, "Error", database), /already closed/);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally {
    for (const [key, value] of [["NOTIFICATIONS_PUSH_ENABLED", oldPush], ["NOTIFICATIONS_EMAIL_ENABLED", oldEmail]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
