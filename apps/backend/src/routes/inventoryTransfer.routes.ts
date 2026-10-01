import { Router } from "express";
import {
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

export default router;
