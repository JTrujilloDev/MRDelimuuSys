import { Router } from "express";
import {
  cancelInventoryTransfer,
  createInventoryTransfer,
  getInventoryTransferDestinations,
  getInventoryTransfers,
  receiveInventoryTransfer,
} from "../controllers/inventoryTransfer.controller";

const router = Router();

router.get("/destinations", getInventoryTransferDestinations);
router.get("/", getInventoryTransfers);
router.post("/", createInventoryTransfer);
router.post("/:transferId/receive", receiveInventoryTransfer);
router.post("/:transferId/cancel", cancelInventoryTransfer);

export default router;
