import { Router } from "express";
import { createFinancialTransaction, getFinancialTransactions, voidExpense } from "../controllers/financial.controller";
import { requireCashRegisterInActiveStore } from "../middleware/storeScope.middleware";
import { requireOpenShiftOperator } from "../middleware/shift.middleware";

const router = Router();

router.get("/", getFinancialTransactions);
router.post("/", requireOpenShiftOperator, requireCashRegisterInActiveStore, createFinancialTransaction);
router.post("/:id/void", requireOpenShiftOperator, voidExpense);

export default router;
