import { Router } from "express";
import { addAccountItem, adjustAccountItemQuantity, closeAccount, createAccount, deleteAccount, getAllAccounts, removeAccountItem, updateAccount } from "../controllers/account.controller";
import { requireAccountInActiveStore } from "../middleware/storeScope.middleware";
import { requireOpenShiftOperator } from "../middleware/shift.middleware";

const router = Router();

router.get("/", getAllAccounts);
router.post("/", requireOpenShiftOperator, createAccount);
router.put("/add-item", requireOpenShiftOperator, requireAccountInActiveStore, addAccountItem);
router.put("/adjust-quantity", requireOpenShiftOperator, requireAccountInActiveStore, adjustAccountItemQuantity);
router.put("/remove-item", requireOpenShiftOperator, requireAccountInActiveStore, removeAccountItem);
router.put("/close", requireOpenShiftOperator, requireAccountInActiveStore, closeAccount);
router.put("/:id", requireOpenShiftOperator, requireAccountInActiveStore, updateAccount);
router.delete("/:id", requireOpenShiftOperator, requireAccountInActiveStore, deleteAccount);

export default router
