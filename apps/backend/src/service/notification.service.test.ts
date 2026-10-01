import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { enqueueShiftClosed, processNotificationQueue, scanLowStock } from "./notification.service";

const keys = ["NOTIFICATIONS_EMAIL_ENABLED", "NOTIFICATIONS_PUSH_ENABLED", "GMAIL_USER", "GMAIL_APP_PASSWORD", "NOTIFICATIONS_EMAIL_TO", "NTFY_TOPIC"];

test("cola y alertas sin conexiones externas", async (t) => {
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
    }
  });

  await t.test("un cierre guarda un mensaje por destinatario y uno push; canales apagados no consultan BD", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";
    process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
    const messages = new Map<string, unknown>();
    let queries = 0;
    const tx = {
      cashRegister: { findUniqueOrThrow: async () => {
        queries++;
        return { id: 1, openedAt: new Date(), closedAt: new Date(), openingAmount: 10000,
          user: { name: "Ana" }, terminal: { name: "Caja", store: { name: "Veleño 2" } },
          accounts: [{ id: 3, status: "CLOSED", total: 0, discount: 7000, paymentMethod: "CASH", discountObservation: "Cortesía" }],
        };
      } },
      notificationOutbox: { upsert: async (args: { where: { deduplicationKey: string }; create: unknown }) => {
        if (!messages.has(args.where.deduplicationKey)) messages.set(args.where.deduplicationKey, args.create);
      } },
    } as unknown as Prisma.TransactionClient;
    const closing = { totalExpenses: 0, expectedCash: 10000, closingAmount: 10000, difference: 0, differenceJustification: null };
    await enqueueShiftClosed(tx, 1, closing);
    assert.equal(queries, 0);
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.NOTIFICATIONS_PUSH_ENABLED = "true";
    process.env.NOTIFICATIONS_EMAIL_TO = "one@example.com,two@example.com,one@example.com";
    process.env.NTFY_TOPIC = "test-private";
    await enqueueShiftClosed(tx, 1, closing);
    await enqueueShiftClosed(tx, 1, closing);
    assert.equal(messages.size, 3);
    const first = [...messages.values()][0] as { payload: { totalSales: number; totalDiscounts: number; store: string } };
    assert.equal(first.payload.totalSales, 0);
    assert.equal(first.payload.totalDiscounts, 7000);
    assert.equal(first.payload.store, "Veleño 2");
  });

  await t.test("nivel persistente evita repetir alertas y se rearma tras reposición", async () => {
    process.env.NOTIFICATIONS_PUSH_ENABLED = "true";
    let stock = 6;
    let state: { level: string; revision: number } | null = null;
    const messages: unknown[] = [];
    const tx = {
      $queryRaw: async () => [{ acquired: true }],
      storeInventory: { findMany: async () => [{ storeId: 2, productVariantId: 4, stock, minStock: 5,
        store: { groupId: 2, name: "Veleño 1" }, productVariant: { name: "Unidad", product: { name: "Arroz con leche", productType: "FINISHED_PRODUCT" }, catalogItems: [{ groupId: 2 }] },
      }] },
      stockNotificationState: {
        findUnique: async () => state,
        upsert: async (args: { create: { level: string; revision: number }; update: { level: string; revision: number } }) => { state = state ? args.update : args.create; },
      },
      notificationOutbox: { upsert: async (args: { create: unknown }) => { messages.push(args.create); } },
    };
    const database = { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) } as unknown as Pick<typeof prisma, "$transaction">;
    for (const quantity of [6, 5, 4, 0, 0, 10, 5]) { stock = quantity; await scanLowStock(database); }
    assert.equal(messages.length, 3);
    assert.deepEqual(messages.map((message) => (message as { payload: { level: string } }).payload.level), ["LOW", "EMPTY", "LOW"]);
  });

  await t.test("entrega, rechazo del proveedor, límite de intentos y reserva concurrente", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
    process.env.GMAIL_USER = "test@example.com";
    process.env.GMAIL_APP_PASSWORD = "not-a-real-credential";
    const messages = [
      { id: 1, attempts: 0 }, { id: 2, attempts: 7 }, { id: 3, attempts: 0 }, { id: 4, attempts: 0 },
    ].map((message) => ({ ...message, channel: "EMAIL", kind: "SHIFT_CLOSED", recipient: "to@example.com", payload: {} }));
    const updates: { where: { id: number }; data: { status?: string; lastError?: string } }[] = [];
    const outbox = {
      findMany: async () => messages,
      updateMany: async (args: typeof updates[number]) => {
        updates.push(args); return { count: args.where.id === 3 ? 0 : 1 };
      },
    } as unknown as typeof prisma.notificationOutbox;
    const delivered: number[] = [];
    await processNotificationQueue(async (message) => {
      delivered.push(message.id);
      if (message.id === 2 || message.id === 4) throw new Error("sensitive-provider-response");
    }, outbox);
    assert.deepEqual(delivered, [1, 2, 4]);
    assert.equal(updates.find((item) => item.where.id === 1 && item.data.status)?.data.status, "SENT");
    assert.equal(updates.find((item) => item.where.id === 2 && item.data.status)?.data.status, "FAILED");
    assert.equal(updates.find((item) => item.where.id === 4 && item.data.status)?.data.status, "PENDING");
    assert.ok(!JSON.stringify(updates).includes("sensitive-provider-response"));
  });

  await t.test("sin credenciales no intenta consultar ni entregar mensajes", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
    delete process.env.GMAIL_APP_PASSWORD;
    const outbox = { findMany: async () => { throw new Error("No debe consultar"); } } as unknown as typeof prisma.notificationOutbox;
    await processNotificationQueue(async () => { throw new Error("No debe enviar"); }, outbox);
  });
});
