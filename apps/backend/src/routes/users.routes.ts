import { Router } from "express";
import { createUser, deleteUser, getAllUsers, updateUser } from "../controllers/users.controller";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth, requireGlobalAdmin);

router.get("/", getAllUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);
router.put("/:id", updateUser);

export default router;
