import { Router } from "express";
import { createProduct, deleteProduct, getAllActiveProducts, getAllProducts, getProductById, getProductsByCategory, updateProduct } from "../controllers/product.controller";

const router = Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.get("/active", getAllActiveProducts);
router.post("/", createProduct);
router.delete("/:id", deleteProduct);
router.put("/:id", updateProduct);
router.get("/by-category/:id",getProductsByCategory)

export default router;
