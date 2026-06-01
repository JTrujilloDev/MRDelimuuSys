import { Router } from "express";
import { createProduct, deleteProduct, getAllActiveProducts, getAllProducts, getProductById, getProductsByCategory, updateProduct } from "../controllers/product.controller";

const router = Router();

router.get("/", getAllProducts);

router.get("/active", getAllActiveProducts);
router.get("/by-category/:id", getProductsByCategory);

router.get("/:id", getProductById);

router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
