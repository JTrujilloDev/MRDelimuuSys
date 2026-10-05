import nodemailer from "nodemailer";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { buildShiftSalesSummary } from "./shiftSalesSummary.rules";
import { summarizeCreditCollections } from "./credit.rules";
import { renderShiftNotification, retryDelayMs, ShiftNotification, stockAlertLevel } from "./notification.rules";

const enabled = (key: string) => process.env[key] === "true";
const emailEnabled = () => enabled("NOTIFICATIONS_EMAIL_ENABLED");
const pushEnabled = () => enabled("NOTIFICATIONS_PUSH_ENABLED");
const publicTopicAllowed = () => enabled("NTFY_ALLOW_PUBLIC_TOPIC");
const pushTransportReady = () => {
  try {
    return new URL(process.env.NTFY_BASE_URL || "").protocol === "https:"
      && Boolean(process.env.NTFY_TOKEN?.trim() || publicTopicAllowed());
  } catch { return false; }
};
const recipients = () => [...new Set((process.env.NOTIFICATIONS_EMAIL_TO || "").split(",").map((item) => item.trim()).filter(Boolean))];

const enqueue = async (tx: Prisma.TransactionClient, key: string, channel: string, kind: string, recipient: string, payload: Prisma.InputJsonValue) => {
  await tx.notificationOutbox.upsert({
    where: { deduplicationKey: key }, update: {},
    create: { deduplicationKey: key, channel, kind, recipient, payload },
  });
};

// Called inside the closing transaction: rollback also removes the pending messages.
export const enqueueShiftClosed = async (
  tx: Prisma.TransactionClient, shiftId: number,
  closing: { totalExpenses: number; expectedCash: number; closingAmount: number; difference: number; differenceJustification: string | null },
) => {
  if (!emailEnabled() && !pushEnabled()) return;
  const shift = await tx.cashRegister.findUniqueOrThrow({
    where: { id: shiftId },
    include: { user: { select: { name: true } }, terminal: { include: { store: true } }, accounts: true, transactions: true, inventoryCounts: { include: { items: true } } },
  });
  const payload: ShiftNotification = {
    shiftId, store: shift.terminal.store.name, terminal: shift.terminal.name, user: shift.user.name,
    openedAt: shift.openedAt.toISOString(), closedAt: shift.closedAt!.toISOString(),
    ...buildShiftSalesSummary(shift.accounts), openingAmount: shift.openingAmount,
    ...summarizeCreditCollections(shift.transactions ?? []),
    totalExpenses: closing.totalExpenses, expectedCash: closing.expectedCash,
    closingAmount: closing.closingAmount, difference: closing.difference,
    justification: closing.differenceJustification || "",
    cancelledCount: shift.accounts.filter((account) => account.status === "CANCELLED").length,
    observations: [...(shift.inventoryCounts ?? []).flatMap(count => [
      `Conteo ${count.phase === "OPENING" ? "inicial" : "final"}: ${count.items.length} productos verificados; ${count.items.filter(item => item.difference !== 0).length} diferencias pendientes de revisión.`,
      ...count.items.map(item => `${count.phase === "OPENING" ? "Apertura" : "Cierre"} — ${item.productName}: esperado ${item.expectedQuantity}, contado ${item.countedQuantity}, diferencia ${item.difference}. ${item.justification || "Sin diferencia"}`),
    ]), ...shift.accounts.flatMap((account) => {
      if (account.status === "CANCELLED") return [`Venta #${account.id} anulada: ${account.cancellationReason || "Sin observación"}`];
      if (account.status === "CLOSED" && account.discount > 0) return [`Venta #${account.id}: descuento ${account.discount} COP — ${account.discountObservation || "Sin observación"}`];
      return [];
    })],
  };
  // Blank recipient remains pending until configuration is supplied.
  if (emailEnabled()) for (const recipient of recipients().length ? recipients() : [""]) {
    await enqueue(tx, `shift:${shiftId}:email:${recipient}`, "EMAIL", "SHIFT_CLOSED", recipient, payload as unknown as Prisma.InputJsonValue);
  }
  if (pushEnabled()) await enqueue(tx, `shift:${shiftId}:push`, "PUSH", "SHIFT_CLOSED", process.env.NTFY_TOPIC || "", payload as unknown as Prisma.InputJsonValue);
};

export const scanLowStock = async (database: Pick<typeof prisma, "$transaction"> = prisma) => {
  if (!pushEnabled()) return;
  await database.$transaction(async (tx) => {
    // Serialize scanners across server instances; per-item revisions identify alert episodes.
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(72831902) AS acquired`;
    if (!lock.acquired) return;
    const inventories = await tx.storeInventory.findMany({
      where: { isInitialized: true, store: { isActive: true, group: { isActive: true } }, productVariant: { isActive: true, product: { productType: { not: "RECIPE_PRODUCT" } } } },
      include: { store: true, productVariant: { include: { product: true, catalogItems: { select: { groupId: true } } } } },
    });
    for (const inventory of inventories) {
      const item = inventory.productVariant;
      const eligible = item.catalogItems.some((entry) => entry.groupId === inventory.store.groupId)
        || ["INGREDIENT", "PACKAGING", "PREPARED_BASE"].includes(item.product.productType);
      const level = eligible ? stockAlertLevel(inventory.stock, inventory.minStock) : "NORMAL";
      const key = { storeId: inventory.storeId, productVariantId: inventory.productVariantId };
      const previous = await tx.stockNotificationState.findUnique({ where: { storeId_productVariantId: key } });
      if (previous?.level === level) continue;
      const revision = (previous?.revision || 0) + 1;
      await tx.stockNotificationState.upsert({ where: { storeId_productVariantId: key }, create: { ...key, level, revision }, update: { level, revision } });
      if (level === "NORMAL") continue;
      await enqueue(tx, `stock:${key.storeId}:${key.productVariantId}:${revision}`, "PUSH", "STOCK_LOW", process.env.NTFY_TOPIC || "", {
        store: inventory.store.name, product: `${item.product.name} / ${item.name}`, stock: inventory.stock, minimum: inventory.minStock, level, observedAt: new Date().toISOString(),
      });
    }
  }, { timeout: 30_000 });
};

const channelReady = (channel: string, recipient: string) => channel === "EMAIL"
  ? emailEnabled() && Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && (recipient || recipients().length))
  : pushEnabled() && pushTransportReady() && /^[A-Za-z0-9_-]{1,64}$/.test(recipient || process.env.NTFY_TOPIC || "");

export const deliverNotification = async (message: { id: number; channel: string; kind: string; recipient: string; payload: Prisma.JsonValue }) => {
  if (message.channel === "EMAIL") {
    const rendered = renderShiftNotification(message.payload as unknown as ShiftNotification);
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, "") },
      connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 20_000,
    });
    try {
      const result = await transport.sendMail({
        from: process.env.GMAIL_USER, to: message.recipient || recipients(),
        subject: rendered.subject, text: rendered.text, html: rendered.html,
        messageId: `<delimuu-notification-${message.id}@${process.env.GMAIL_USER!.split("@")[1]}>`,
      });
      if (result.rejected?.length) throw new Error("Recipient rejected");
    } finally { transport.close(); }
    return;
  }
  if (!pushTransportReady()) throw new Error("Push authentication or explicit public mode required");
  const topic = message.recipient || process.env.NTFY_TOPIC!;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(topic)) throw new Error("Invalid topic");
  const url = new URL(process.env.NTFY_BASE_URL!);
  if (url.protocol !== "https:") throw new Error("HTTPS required");
  let title: string, body: string, priority = 3;
  if (message.kind === "SHIFT_CLOSED") {
    const rendered = renderShiftNotification(message.payload as unknown as ShiftNotification);
    title = rendered.subject; body = rendered.push;
  } else {
    const data = message.payload as { store: string; product: string; stock: number; minimum: number; level: string; observedAt: string };
    title = data.level === "EMPTY" ? "Producto agotado" : "Stock bajo";
    body = `${data.store}\n${data.product}\nDisponible: ${data.stock} · Mínimo: ${data.minimum}\nDetectado: ${new Date(data.observedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}`;
    priority = data.level === "EMPTY" ? 4 : 3;
  }
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.NTFY_TOKEN?.trim() ? { Authorization: `Bearer ${process.env.NTFY_TOKEN.trim()}` } : {}) },
    body: JSON.stringify({ topic, title, message: body, priority, tags: [message.kind === "SHIFT_CLOSED" ? "receipt" : "warning"] }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Push HTTP ${response.status}`);
};

export const processNotificationQueue = async (send: typeof deliverNotification = deliverNotification, outbox = prisma.notificationOutbox) => {
  const targets: Prisma.NotificationOutboxWhereInput[] = [];
  if (emailEnabled() && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) targets.push({ channel: "EMAIL", ...(!recipients().length && { recipient: { not: "" } }) });
  if (pushEnabled() && pushTransportReady()) targets.push({ channel: "PUSH", ...(!process.env.NTFY_TOPIC && { recipient: { not: "" } }) });
  if (!targets.length) return;
  const now = new Date();
  const messages = await outbox.findMany({
    where: { AND: [{ OR: targets }, { OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }], status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { id: "asc" }, take: 50,
  });
  for (const message of messages) {
    if (!channelReady(message.channel, message.recipient)) continue;
    const lease = new Date(Date.now() + 120_000);
    const claimed = await outbox.updateMany({
      where: { id: message.id, status: "PENDING", attempts: message.attempts, nextAttemptAt: { lte: new Date() }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] },
      data: { lockedUntil: lease, attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      await send(message);
      await outbox.updateMany({ where: { id: message.id, lockedUntil: lease }, data: { status: "SENT", sentAt: new Date(), lockedUntil: null, lastError: null } });
    } catch {
      // Do not persist provider responses, addresses or credentials in error messages.
      const attempts = message.attempts + 1;
      await outbox.updateMany({ where: { id: message.id, lockedUntil: lease }, data: {
        status: attempts >= 8 ? "FAILED" : "PENDING", lockedUntil: null,
        nextAttemptAt: new Date(Date.now() + retryDelayMs(attempts)),
        lastError: "No fue posible entregar la notificación. Revisa la conexión y la configuración del proveedor.",
      } });
    }
  }
};

export const notificationConfiguration = () => ({
  emailEnabled: emailEnabled(), pushEnabled: pushEnabled(),
  emailReady: channelReady("EMAIL", ""), pushReady: channelReady("PUSH", ""),
  pushPublicMode: publicTopicAllowed() && !process.env.NTFY_TOKEN?.trim(),
});

export const startNotificationWorker = () => {
  if (!emailEnabled() && !pushEnabled()) return () => {};
  const config = notificationConfiguration();
  if (config.pushEnabled && config.pushPublicMode) console.warn("ntfy: modo público habilitado; las alertas pueden ser leídas por terceros que conozcan el tema.");
  if ((config.emailEnabled && !config.emailReady) || (config.pushEnabled && !config.pushReady)) {
    console.warn("Notificaciones: falta configuración; los mensajes permanecerán pendientes.");
  }
  let busy = false;
  let scanning = false;
  const scan = async () => {
    if (scanning) return;
    scanning = true;
    try { await scanLowStock(); }
    catch { console.error("Notificaciones: no se pudo revisar el stock; se reintentará en un minuto."); }
    finally { scanning = false; }
  };
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      await processNotificationQueue();
    } catch { console.error("Notificaciones: no se pudo procesar la cola. Verifica la migración y la conexión a la base de datos."); }
    finally { busy = false; }
  };
  const timer = setInterval(() => { void run(); }, 15_000);
  const stockTimer = setInterval(() => { void scan(); }, 60_000);
  timer.unref();
  stockTimer.unref();
  void scan();
  void run();
  return () => { clearInterval(timer); clearInterval(stockTimer); };
};
