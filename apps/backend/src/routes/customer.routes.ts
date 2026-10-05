import { NextFunction, Request, Response, Router } from "express";
import {
  deactivateCustomer,
  findCustomerByIdentification,
  listCustomers,
  saveCustomer,
  updateCustomer,
} from "../controllers/customer.controller";

const router = Router();
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.auth?.isGlobalAdmin && !["ADMIN", "CASHIER"].includes(req.auth?.storeRole ?? "")) {
    res.status(403).json({ success: false, message: "Solo caja y administración pueden consultar clientes" }); return;
  }
  next();
});
router.get("/lookup", findCustomerByIdentification);
router.get("/", listCustomers);
router.post("/", saveCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deactivateCustomer);

export default router;
