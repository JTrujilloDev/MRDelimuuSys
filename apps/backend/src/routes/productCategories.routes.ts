import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../controllers/productCategories.controller";

const router = Router();

router.post("/", createCategory);
router.get("/", getAllCategories);
router.delete("/:id", deleteCategory);
router.put("/:id", updateCategory);

export default router;
