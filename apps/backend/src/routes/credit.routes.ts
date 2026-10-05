import { Router, Request, Response, NextFunction } from "express";
import { requireOpenShiftOperator } from "../middleware/shift.middleware";
import { listCredits, registerCreditPayment, voidCreditPayment } from "../service/credit.service";

const router = Router();
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.auth?.isGlobalAdmin && !["ADMIN", "CASHIER"].includes(req.auth?.storeRole || "")) {
    res.status(403).json({ success: false, message: "Solo caja y administración pueden gestionar créditos" }); return;
  }
  next();
});
router.get("/", async (req, res) => {
  try { res.json({ success: true, data: await listCredits(req.auth!.activeStoreId!) }); }
  catch { res.status(400).json({ success: false, message: "No fue posible consultar los créditos" }); }
});
router.post("/:id/payments", requireOpenShiftOperator, async (req, res) => {
  try {
    const result = await registerCreditPayment({ accountId: Number(req.params.id), storeId: req.auth!.activeStoreId!,
      terminalId: req.auth!.activeTerminalId!, cashRegisterId: req.auth!.openCashRegisterId!,
      userId: req.auth!.userId,
      amount: req.body.amount, paymentMethod: req.body.paymentMethod, observation: req.body.observation, requestKey: req.body.requestKey });
    res.json({ success: true, data: result });
  } catch (error) { res.status(400).json({ success: false, message: (error as Error).message }); }
});
router.post("/:id/payments/:paymentId/void", requireOpenShiftOperator, async (req, res) => {
  try {
    const result = await voidCreditPayment({ accountId: Number(req.params.id), paymentId: Number(req.params.paymentId),
      storeId: req.auth!.activeStoreId!, terminalId: req.auth!.activeTerminalId!, cashRegisterId: req.auth!.openCashRegisterId!,
      userId: req.auth!.userId, reason: req.body.reason });
    res.json({ success: true, data: result });
  } catch (error) { res.status(400).json({ success: false, message: (error as Error).message }); }
});
export default router;
