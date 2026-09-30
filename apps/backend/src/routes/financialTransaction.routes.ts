import { Router } from "express";
import { createFinancialTransaction, getFinancialTransactions } from "../controllers/financial.controller";
import { requireCashRegisterInActiveStore } from "../middleware/storeScope.middleware";
import { requireOpenShiftOperator } from "../middleware/shift.middleware";

const router = Router();

router.get("/", getFinancialTransactions);
router.post("/", requireOpenShiftOperator, requireCashRegisterInActiveStore, createFinancialTransaction);

export default router;
