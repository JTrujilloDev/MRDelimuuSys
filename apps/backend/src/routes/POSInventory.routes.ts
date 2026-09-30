import { Router } from "express";
import {
  createBulkPOSInventoryTransaction,
  createPOSInventoryTransaction,
  getPOSInventoryTransactions,
} from "../controllers/POSInventory.controller";
import { requireInventoryManager } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getPOSInventoryTransactions);
router.post("/bulk", requireInventoryManager, createBulkPOSInventoryTransaction);
router.post("/", requireInventoryManager, createPOSInventoryTransaction);

export default router;
