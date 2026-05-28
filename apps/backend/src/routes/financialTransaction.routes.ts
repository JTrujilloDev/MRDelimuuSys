import { Router } from "express";
import { createFinancialTransaction, getFinancialTransactions } from "../controllers/financial.controller";

const router = Router();

router.get("/", getFinancialTransactions);
router.post("/", createFinancialTransaction);

export default router;
