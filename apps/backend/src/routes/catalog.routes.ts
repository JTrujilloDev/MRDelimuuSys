import { Router } from "express";
import {
  getGroupCatalog,
  updateGroupCatalogItem,
} from "../controllers/catalog.controller";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth, requireGlobalAdmin);
router.get("/groups/:groupId", getGroupCatalog);
router.patch("/groups/:groupId/variants/:variantId", updateGroupCatalogItem);

export default router;
