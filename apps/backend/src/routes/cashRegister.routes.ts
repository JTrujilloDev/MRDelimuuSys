import { Router } from "express";
import {
  closeCashRegister,
  createCashRegister,
  getOpenCashRegister,
} from "../controllers/cashRegister.controller";

const router = Router();

router.post("/open", createCashRegister);
router.post("/close", closeCashRegister);
router.get("/open/:terminalId", getOpenCashRegister);

export default router;
