import { Router } from "express";
import { createFinancialTransaction, getFinancialTransactions } from "../controllers/financial.controller";
import { requireCashRegisterInActiveStore } from "../middleware/storeScope.middleware";

const router = Router();

router.get("/", getFinancialTransactions);
router.post("/", requireCashRegisterInActiveStore, createFinancialTransaction);

export default router;
