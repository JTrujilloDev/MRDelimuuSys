import { Router } from "express";
import { createUser, deleteUser, getAllUsers, updateUser } from "../controllers/users.controller";

const router = Router()

router.get("/",getAllUsers)
router.post("/",createUser)
router.delete("/:id",deleteUser)
router.put("/:id",updateUser)


export default router;