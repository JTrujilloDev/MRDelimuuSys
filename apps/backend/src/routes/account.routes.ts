import { Router } from "express";
import { addAccountItem, adjustAccountItemQuantity, closeAccount, createAccount, deleteAccount, getAllAccounts, removeAccountItem, updateAccount } from "../controllers/account.controller";
import { requireAccountInActiveStore } from "../middleware/storeScope.middleware";

const router = Router();

router.get("/", getAllAccounts);
router.post("/", createAccount);
router.put("/add-item", requireAccountInActiveStore, addAccountItem);
router.put("/adjust-quantity", requireAccountInActiveStore, adjustAccountItemQuantity);
router.put("/remove-item", requireAccountInActiveStore, removeAccountItem);
router.put("/close", requireAccountInActiveStore, closeAccount);
router.put("/:id", requireAccountInActiveStore, updateAccount);
router.delete("/:id", requireAccountInActiveStore, deleteAccount);

export default router
