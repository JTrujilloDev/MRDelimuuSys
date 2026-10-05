import assert from "node:assert/strict";
import { test } from "node:test";
import { FinancialTransaction } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { createFinancialTransactionService, voidExpenseService, getFinancialTransactionsService } from "./financial.service";

test("gastos: reintento idempotente, anulación única, validaciones y protección del turno", async () => {
  let status = "OPEN";
  let expenses = 0;
  const records: FinancialTransaction[] = [];
  const tx = {
    $queryRaw: async () => [],
    cashRegister: {
      findUnique: async ({ where }: { where: { id: number } }) => where.id === 1 ? { id: 1, status } : null,
      update: async ({ data }: { data: { totalExpenses: { increment: number } } }) => { expenses += data.totalExpenses.increment; },
    },
    financialTransaction: {
      findUnique: async ({ where }: { where: { id?: number; requestKey?: string } }) => records.find(item => where.id ? item.id === where.id : item.requestKey === where.requestKey) ?? null,
      create: async ({ data }: { data: FinancialTransaction }) => {
        const record = { ...data, id: records.length + 1, createdAt: new Date(), voidedAt: null, voidReason: null, voidedByUserId: null };
        records.push(record); return record;
      },
      updateMany: async ({ where, data }: { where: { id: number }; data: Partial<FinancialTransaction> }) => {
        const record = records.find(item => item.id === where.id && !item.voidedAt);
        if (!record) return { count: 0 };
        Object.assign(record, data); return { count: 1 };
      },
    },
  };
  const database = { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
  const input = { type: "EXPENSE", relatedCashRegisterId: 1, amount: 131000, description: "Compra", adjustmentJustification: "Prueba", requestKey: "11111111-1111-4111-8111-111111111111" } as FinancialTransaction;
  const first = await createFinancialTransactionService(input, database);
  const retry = await createFinancialTransactionService(input, database);
  assert.equal(first.id, retry.id);
  assert.equal(records.length, 1);
  assert.equal(expenses, 131000);
  assert.equal(first.amount, -131000);
  assert.equal(first.paymentMethod, "CASH");
  await assert.rejects(createFinancialTransactionService({ ...input, amount: 1 }, database), /otro gasto/);
  for (const amount of [0, -1, Infinity, NaN]) await assert.rejects(createFinancialTransactionService({ ...input, amount }, database), /Invalid amount/);
  await assert.rejects(createFinancialTransactionService({ ...input, description: " " }, database), /description/);
  await assert.rejects(createFinancialTransactionService({ ...input, type: "SALE" }, database), /Solo/);
  await assert.rejects(voidExpenseService(first.id, 2, 3, "Duplicado", database), /turno cerrado/);
  await assert.rejects(voidExpenseService(first.id, 1, 3, " ", database), /motivo/);
  await voidExpenseService(first.id, 1, 3, "  Duplicado  ", database);
  assert.equal(expenses, 0);
  assert.equal(records[0].voidReason, "Duplicado");
  assert.equal(records[0].voidedByUserId, 3);
  await assert.rejects(voidExpenseService(first.id, 1, 3, "Duplicado", database), /ya fue anulado/);
  await assert.rejects(createFinancialTransactionService(input, database), /fue anulado/);
  status = "CLOSED";
  await assert.rejects(createFinancialTransactionService(input, database), /not open/);
  await assert.rejects(voidExpenseService(first.id, 1, 3, "Duplicado", database), /turno cerrado/);
});

test("lista todos los gastos del turno, conserva alcance de punto y excluye anulados por defecto", async () => {
  const queries: any[] = [];
  const database = {
    $transaction: async (queries: Promise<unknown>[]) => Promise.all(queries),
    financialTransaction: {
      findMany: async (args: unknown) => { queries.push(args); return Array.from({ length: 25 }, (_, id) => ({ id })); },
      count: async () => 25,
    },
  } as unknown as Pick<typeof prisma, "$transaction" | "financialTransaction">;
  const result = await getFinancialTransactionsService({ type: "EXPENSE", cashRegisterId: 1 }, 2, database);
  assert.equal(result.data.length, 25);
  assert.equal(queries[0].take, undefined);
  assert.equal(queries[0].where.voidedAt, null);
  assert.equal(queries[0].where.cashRegister.terminal.storeId, 2);
  await getFinancialTransactionsService({ type: "EXPENSE", cashRegisterId: 1, includeVoided: "true" }, 2, database);
  assert.equal(queries[1].where.voidedAt, undefined);
  await assert.rejects(getFinancialTransactionsService({ page: -1 }, 2, database), /pagination/);
});
