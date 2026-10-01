import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";
import { notificationConfiguration } from "../service/notification.service";

const router = Router();
router.use(requireAuth, requireGlobalAdmin);

router.get("/", async (_req, res) => {
  try {
    const messages = await prisma.notificationOutbox.findMany({
      orderBy: { id: "desc" }, take: 100,
      select: { id: true, channel: true, kind: true, status: true, attempts: true, createdAt: true, nextAttemptAt: true, sentAt: true, lastError: true },
    });
    res.json({ success: true, configuration: notificationConfiguration(), messages });
  } catch { res.status(503).json({ success: false, message: "No se pudo consultar la cola de notificaciones. Verifica la migración." }); }
});

router.post("/:id/retry", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "Identificador inválido" }); return;
  }
  try {
    const result = await prisma.notificationOutbox.updateMany({
      where: { id, status: { in: ["PENDING", "FAILED"] }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] },
      data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lockedUntil: null, lastError: null },
    });
    res.status(result.count ? 200 : 409).json({ success: Boolean(result.count), message: result.count ? "Notificación pendiente de reintento" : "La notificación no existe, ya se envió o está siendo procesada" });
  } catch { res.status(503).json({ success: false, message: "No fue posible programar el reintento" }); }
});

export default router;
