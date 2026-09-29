import { Router } from "express";
import {
  createStoreGroup,
  getStoreGroups,
  updateStoreGroup,
} from "../controllers/storeGroup.controller";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth, requireGlobalAdmin);

router.get("/", getStoreGroups);
router.post("/", createStoreGroup);
router.patch("/:id", updateStoreGroup);

export default router;

