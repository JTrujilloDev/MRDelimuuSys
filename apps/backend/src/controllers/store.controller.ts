import { Request, Response } from "express";
import {
  createStoreService,
  getStoresService,
  updateStoreService,
} from "../service/store.service";

export const getStores = async (req: Request, res: Response) => {
  try {
    const stores = await getStoresService(req.query.groupId);
    res.status(200).json({ success: true, data: stores });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createStore = async (req: Request, res: Response) => {
  try {
    const store = await createStoreService(req.body);
    res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: store,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateStore = async (req: Request, res: Response) => {
  try {
    const store = await updateStoreService(req.params.id, req.body);
    res.status(200).json({ success: true, data: store });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
