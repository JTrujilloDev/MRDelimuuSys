import { Router } from "express";
import {
  createBulkPOSInventoryTransaction,
  createPOSInventoryTransaction,
  getPOSInventoryTransactions,
  updateStoreInventorySettings,
} from "../controllers/POSInventory.controller";
import { requireInventoryManager } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getPOSInventoryTransactions);
router.patch("/variants/:variantId/settings", requireInventoryManager, updateStoreInventorySettings);
router.post("/bulk", requireInventoryManager, createBulkPOSInventoryTransaction);
router.post("/", requireInventoryManager, createPOSInventoryTransaction);

export default router;
