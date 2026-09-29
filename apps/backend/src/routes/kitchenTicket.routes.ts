import { Router } from "express";
import { acknowledgeKitchenTicketAdjustment, createKitchenTicketAdjustment, createKitchenTicket, getKitchenTickets, updateKitchenTicketStatus } from "../controllers/kitchenTicket.controller";
import { requireKitchenEnabled } from "../middleware/storeScope.middleware";

const router = Router();
router.use(requireKitchenEnabled);
router.get("/", getKitchenTickets);
router.post("/", createKitchenTicket);
router.patch("/:id/status", updateKitchenTicketStatus);
router.post("/adjustments", createKitchenTicketAdjustment);
router.patch("/adjustments/:adjustmentId/acknowledge", acknowledgeKitchenTicketAdjustment);
export default router;
