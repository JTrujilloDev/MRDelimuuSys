import { Router } from "express";
import {
  closeCashRegister,
  createCashRegister,
  getOpenCashRegister,
  getCashRegisterHistory,
} from "../controllers/cashRegister.controller";
import { requireCashRegisterInActiveStore } from "../middleware/storeScope.middleware";
import { requireOpenShiftOperator } from "../middleware/shift.middleware";
import { readInventoryCount, mutateInventoryCount, resolveInventoryCount } from "../controllers/shiftInventory.controller";

const router = Router();

router.post("/open", createCashRegister);
router.post("/close", requireOpenShiftOperator, requireCashRegisterInActiveStore, closeCashRegister);
router.get("/history", getCashRegisterHistory);
router.get("/:id/inventory-count", readInventoryCount);
router.post("/inventory-count/item", requireOpenShiftOperator, mutateInventoryCount("item"));
router.post("/inventory-count/confirm", requireOpenShiftOperator, mutateInventoryCount("confirm"));
router.post("/inventory-count/reopen", requireOpenShiftOperator, mutateInventoryCount("reopen"));
router.post("/inventory-count-items/:itemId/resolve", resolveInventoryCount);
router.get("/open/:terminalId", getOpenCashRegister);

export default router;
