import { Router } from "express";
import { createStore, getStores, updateStore } from "../controllers/store.controller";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth, requireGlobalAdmin);

router.get("/", getStores);
router.post("/", createStore);
router.patch("/:id", updateStore);

export default router;
