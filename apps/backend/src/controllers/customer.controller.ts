import { Request, Response } from "express";
import { CUSTOMER_IDENTIFICATION_TYPES, type CustomerIdentificationType } from "../service/customer.rules";
import {
  createOrUpdateCustomerService,
  deactivateCustomerService,
  findCustomerByIdentificationService,
  getAllCustomersService,
  updateCustomerService,
} from "../service/customer.service";

const failure = (res: Response, error: unknown) =>
  res.status(400).json({ success: false, message: error instanceof Error ? error.message : "No fue posible gestionar el cliente" });

export const saveCustomer = async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await createOrUpdateCustomerService(req.body) }); }
  catch (error) { failure(res, error); }
};

export const findCustomerByIdentification = async (req: Request, res: Response) => {
  try {
    const identificationType = String(req.query.identificationType ?? "") as CustomerIdentificationType;
    if (!CUSTOMER_IDENTIFICATION_TYPES.includes(identificationType)) throw new Error("Tipo de identificación no válido");
    const customer = await findCustomerByIdentificationService(identificationType, req.query.identification);
    if (!customer || !customer.isActive) {
      res.status(404).json({ success: false, message: "Cliente no registrado" }); return;
    }
    res.json({ success: true, data: customer });
  } catch (error) { failure(res, error); }
};

export const listCustomers = async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await getAllCustomersService(req.query.search) }); }
  catch (error) { failure(res, error); }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await updateCustomerService(Number(req.params.id), req.body) }); }
  catch (error) { failure(res, error); }
};

export const deactivateCustomer = async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await deactivateCustomerService(Number(req.params.id)) }); }
  catch (error) { failure(res, error); }
};
