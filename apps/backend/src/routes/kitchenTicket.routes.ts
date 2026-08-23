import { Router } from "express";
import { createKitchenTicket, getKitchenTickets, updateKitchenTicketStatus } from "../controllers/kitchenTicket.controller";

const router = Router();
router.get("/", getKitchenTickets);
router.post("/", createKitchenTicket);
router.patch("/:id/status", updateKitchenTicketStatus);
export default router;
