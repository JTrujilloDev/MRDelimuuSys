import { Router } from "express";
import {
  getCurrentSession,
  login,
  logout,
  selectContext,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, getCurrentSession);
router.post("/context", requireAuth, selectContext);
router.post("/logout", requireAuth, logout);

export default router;

