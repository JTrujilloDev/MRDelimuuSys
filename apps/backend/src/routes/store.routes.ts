import { Router } from "express";
import { createStore, getStores, updateStore } from "../controllers/store.controller";

const router = Router();

router.get("/", getStores);
router.post("/", createStore);
router.patch("/:id", updateStore);

export default router;
