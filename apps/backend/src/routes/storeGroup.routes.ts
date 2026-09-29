import { Router } from "express";
import {
  createStoreGroup,
  getStoreGroups,
  updateStoreGroup,
} from "../controllers/storeGroup.controller";

const router = Router();

router.get("/", getStoreGroups);
router.post("/", createStoreGroup);
router.patch("/:id", updateStoreGroup);

export default router;

