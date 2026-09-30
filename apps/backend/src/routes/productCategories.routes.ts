import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../controllers/productCategories.controller";
import { requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();

router.post("/", requireGlobalAdmin, createCategory);
router.get("/", getAllCategories);
router.delete("/:id", requireGlobalAdmin, deleteCategory);
router.put("/:id", requireGlobalAdmin, updateCategory);

export default router;
