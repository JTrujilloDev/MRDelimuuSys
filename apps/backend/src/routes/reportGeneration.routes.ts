import { Router } from "express";
import { getStockReport, getStockReportPdf } from "../controllers/reportGenerator.controller";
import { getOperationsReport } from "../controllers/operationsReport.controller";
import { requireInventoryManager } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getStockReport);
router.get("/pdf", getStockReportPdf);
router.get("/operations", requireInventoryManager, getOperationsReport);

export default router;
