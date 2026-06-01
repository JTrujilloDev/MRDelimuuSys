import { Router } from "express";
import { createPOSInventoryTransaction, getPOSInventoryTransactions } from "../controllers/POSInventory.controller";

const router = Router();

router.get("/", getPOSInventoryTransactions);
router.post("/", createPOSInventoryTransaction);

export default router;