import { Router } from "express";
import { getElectronicDocuments, sendElectronicDocument } from "../controllers/billing.controller";
import { requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();
router.use(requireGlobalAdmin);
router.get("/documents", getElectronicDocuments);
router.post("/documents/:documentId/send", sendElectronicDocument);

export default router;
