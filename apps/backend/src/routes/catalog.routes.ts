import { Router } from "express";
import {
  deleteGroupCatalogItem,
  getGroupCatalog,
  updateGroupCatalogItem,
} from "../controllers/catalog.controller";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth);
router.get("/groups/:groupId", getGroupCatalog);
router.patch("/groups/:groupId/variants/:variantId", requireGlobalAdmin, updateGroupCatalogItem);
router.delete("/groups/:groupId/variants/:variantId", requireGlobalAdmin, deleteGroupCatalogItem);

export default router;
