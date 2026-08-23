import { Router } from "express";
import productCategoriesRoutes from "./productCategories.routes";
import productsRoutes from "./products.routes";
import accountRoutes from "./account.routes";
import cashRegisterRoutes from "./cashRegister.routes";
import storeRoutes from "./store.routes";
import terminalRoutes from "./terminal.routes";
import usersRoutes from "./users.routes";
import financialTransactionRoutes from "./financialTransaction.routes";
import POSInventoryRoutes from "./POSInventory.routes";
import reportGenerationRoutes from "./reportGeneration.routes";
import qzRoutes from "./qz.routes";
import kitchenTicketRoutes from "./kitchenTicket.routes";

const router = Router();

router.use("/accounts", accountRoutes);
router.use("/product-categories", productCategoriesRoutes);
router.use("/products", productsRoutes);
router.use("/cash-register", cashRegisterRoutes);
router.use("/store", storeRoutes);
router.use("/terminal", terminalRoutes);
router.use("/users", usersRoutes);
router.use("/financial-transactions", financialTransactionRoutes);
router.use("/pos-inventory", POSInventoryRoutes);
router.use("/reports", reportGenerationRoutes);
router.use("/qz", qzRoutes);
router.use("/kitchen-tickets", kitchenTicketRoutes);


export default router;
