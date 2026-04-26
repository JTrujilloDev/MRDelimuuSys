import { Router } from "express";
import { addAccountItem, adjustAccountItemQuantity, closeAccount, createAccount, deleteAccount, getAllAccounts, removeAccountItem } from "../controllers/account.controller";

const router = Router();

router.get("/:relatedUserId", getAllAccounts);
router.post("/", createAccount);
router.put("/add-item", addAccountItem)
router.put("/adjust-quantity", adjustAccountItemQuantity)
router.put("/remove-item", removeAccountItem)
router.put("/close", closeAccount)
router.delete("/:id", deleteAccount)

export default router