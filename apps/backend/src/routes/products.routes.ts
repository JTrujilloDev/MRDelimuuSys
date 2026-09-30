import { Router } from "express";
import { createProduct, deleteProduct, getAllActiveProducts, getAllProducts, getInventoryProducts, getProductById, getProductsByCategory, updateProduct } from "../controllers/product.controller";
import { requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getAllProducts);

router.get("/active", getAllActiveProducts);
router.get("/inventory", getInventoryProducts);
router.get("/by-category/:id", getProductsByCategory);

router.get("/:id", getProductById);

router.post("/", requireGlobalAdmin, createProduct);
router.put("/:id", requireGlobalAdmin, updateProduct);
router.delete("/:id", requireGlobalAdmin, deleteProduct);

export default router;
