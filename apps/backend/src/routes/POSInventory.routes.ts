import { Router } from "express";
import {
  createBulkPOSInventoryTransaction,
  createPOSInventoryTransaction,
  getPOSInventoryTransactions,
} from "../controllers/POSInventory.controller";

const router = Router();

router.get("/", getPOSInventoryTransactions);
router.post("/bulk", createBulkPOSInventoryTransaction);
router.post("/", createPOSInventoryTransaction);

export default router;
