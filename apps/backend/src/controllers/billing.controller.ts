import { Request, Response } from "express";
import {
  getElectronicDocumentsService,
  sendElectronicDocumentService,
} from "../service/billing.service";

export const getElectronicDocuments = async (req: Request, res: Response) => {
  try {
    const data = await getElectronicDocumentsService({
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      storeId: req.query.storeId ? Number(req.query.storeId) : undefined,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const sendElectronicDocument = async (req: Request, res: Response) => {
  try {
    const data = await sendElectronicDocumentService(String(req.params.documentId));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
