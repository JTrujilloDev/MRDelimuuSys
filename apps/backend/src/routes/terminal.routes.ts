import { Router } from "express";
import {
  createTerminal,
  getTerminals,
  updateTerminal,
} from "../controllers/terminal.controller";

const router = Router();

router.get("/", getTerminals);
router.post("/", createTerminal);
router.patch("/:id", updateTerminal);

export default router;
