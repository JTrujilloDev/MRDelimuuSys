import { Router } from "express";
import {
  closeCashRegister,
  createCashRegister,
  getOpenCashRegister,
  getCashRegisterHistory,
} from "../controllers/cashRegister.controller";
import { requireCashRegisterInActiveStore } from "../middleware/storeScope.middleware";
import { requireOpenShiftOperator } from "../middleware/shift.middleware";

const router = Router();

router.post("/open", createCashRegister);
router.post("/close", requireOpenShiftOperator, requireCashRegisterInActiveStore, closeCashRegister);
router.get("/history", getCashRegisterHistory);
router.get("/open/:terminalId", getOpenCashRegister);

export default router;
