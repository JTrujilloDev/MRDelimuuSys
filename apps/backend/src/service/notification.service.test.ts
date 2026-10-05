import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { deliverNotification, enqueueShiftClosed, notificationConfiguration, processNotificationQueue, scanLowStock } from "./notification.service";

const keys = ["NOTIFICATIONS_EMAIL_ENABLED", "NOTIFICATIONS_PUSH_ENABLED", "GMAIL_USER", "GMAIL_APP_PASSWORD", "NOTIFICATIONS_EMAIL_TO", "NTFY_TOPIC", "NTFY_BASE_URL", "NTFY_TOKEN", "NTFY_ALLOW_PUBLIC_TOPIC"];

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

  await t.test("push gratuito requiere permiso explícito y no inventa un Bearer token", async (t) => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";
    process.env.NOTIFICATIONS_PUSH_ENABLED = "true";
    process.env.NTFY_BASE_URL = "https://ntfy.sh";
    process.env.NTFY_TOPIC = "fake-test-topic";
    delete process.env.NTFY_TOKEN;
    delete process.env.NTFY_ALLOW_PUBLIC_TOPIC;
    const message = { id: 7, channel: "PUSH", kind: "STOCK_LOW", recipient: "fake-test-topic", payload: { store: "Prueba", product: "Producto", stock: 2, minimum: 5, level: "LOW", observedAt: new Date().toISOString() } };
    assert.equal(notificationConfiguration().pushReady, false);
    await assert.rejects(deliverNotification(message), /explicit public mode/);
    await processNotificationQueue(async () => { throw new Error("No debe enviar"); }, { findMany: async () => { throw new Error("No debe consultar"); } } as unknown as typeof prisma.notificationOutbox);
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    const calls: RequestInit[] = [];
    globalThis.fetch = (async (_url, init) => { calls.push(init!); return { ok: true } as Response; }) as typeof fetch;
    process.env.NTFY_ALLOW_PUBLIC_TOPIC = "true";
    assert.equal(notificationConfiguration().pushReady, true);
    await deliverNotification(message);
    assert.equal(new Headers(calls[0].headers).has("Authorization"), false);
    assert.equal(JSON.parse(calls[0].body as string).topic, "fake-test-topic");
    const stockAlert = JSON.parse(calls[0].body as string);
    assert.equal(stockAlert.title, "Stock bajo");
    assert.ok(stockAlert.message.includes("Prueba\nProducto\nDisponible: 2"));
    assert.equal(stockAlert.priority, 3);
    let sent = false;
    const outbox = { findMany: async () => [{ ...message, attempts: 0 }], updateMany: async () => ({ count: 1 }) } as unknown as typeof prisma.notificationOutbox;
    await processNotificationQueue(async () => { sent = true; }, outbox);
    assert.equal(sent, true);
    process.env.NTFY_TOKEN = "fake-token";
    await deliverNotification(message);
    assert.equal(new Headers(calls[1].headers).get("Authorization"), "Bearer fake-token");
    assert.equal(notificationConfiguration().pushPublicMode, false);
    delete process.env.NTFY_TOKEN;
    await deliverNotification({ ...message, payload: { ...message.payload, stock: 0, level: "EMPTY" } });
    const emptyAlert = JSON.parse(calls[2].body as string);
    assert.equal(emptyAlert.title, "Producto agotado");
    assert.ok(emptyAlert.message.includes("Disponible: 0"));
    assert.equal(emptyAlert.priority, 4);
    await deliverNotification({ ...message, kind: "SHIFT_CLOSED", payload: {
      shiftId: 42, store: "Veleño 2", terminal: "Caja 1", user: "Prueba",
      openedAt: "2026-10-02T12:00:00Z", closedAt: "2026-10-02T22:00:00Z",
      saleCount: 1, grossSales: 12000, totalSales: 10000, totalDiscounts: 2000,
      cashAmount: 10000, cardAmount: 0, qrAmount: 0, creditAmount: 0,
      openingAmount: 5000, totalExpenses: 0, expectedCash: 15000,
      closingAmount: 15000, difference: 0, justification: "", cancelledCount: 0, observations: [],
    } });
    const closingAlert = JSON.parse(calls[3].body as string);
    assert.equal(closingAlert.title, "Cierre de turno #42 — Veleño 2");
    assert.ok(closingAlert.message.includes("Veleño 2 · Caja 1"));
    assert.match(closingAlert.message, /Ventas:.*10[.,]000/);
    assert.match(closingAlert.message, /Descuentos:.*2[.,]000/);
    assert.match(closingAlert.message, /Efectivo:.*15[.,]000/);
    assert.ok(closingAlert.message.includes("Diferencia:"));
    assert.deepEqual(closingAlert.tags, ["receipt"]);
    assert.equal(new Headers(calls[3].headers).has("Authorization"), false);
    process.env.NTFY_BASE_URL = "http://ntfy.sh";
    assert.equal(notificationConfiguration().pushReady, false);
    await assert.rejects(deliverNotification(message), /explicit public mode/);
  });
});
