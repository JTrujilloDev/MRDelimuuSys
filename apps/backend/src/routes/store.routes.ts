import { Router } from "express";
import { createStore } from "../controllers/store.controller";
;

const router = Router()

router.post("/", createStore)

export default router