import { Request, Response } from "express";
import { createStoreService } from "../service/store.service";

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