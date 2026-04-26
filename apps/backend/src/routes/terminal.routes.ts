import { Router } from "express";
import { createTerminal } from "../controllers/terminal.controller";

const router = Router();

router.post("/", createTerminal);

export default router;
