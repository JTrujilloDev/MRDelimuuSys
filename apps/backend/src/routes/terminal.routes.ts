import { Router } from "express";
import {
  createTerminal,
  getTerminals,
  updateTerminal,
} from "../controllers/terminal.controller";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth, requireGlobalAdmin);

router.get("/", getTerminals);
router.post("/", createTerminal);
router.patch("/:id", updateTerminal);

export default router;
