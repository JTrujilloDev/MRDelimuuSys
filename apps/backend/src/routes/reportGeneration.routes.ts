import { Router } from "express";
import { getStockReport, getStockReportPdf } from "../controllers/reportGenerator.controller";

const router = Router();

router.get("/", getStockReport);
router.get("/pdf", getStockReportPdf);

export default router;
