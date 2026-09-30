import { Request, Response } from "express";
import {
  getGroupCatalogService,
  updateGroupCatalogItemService,
} from "../service/catalog.service";

export const getGroupCatalog = async (req: Request, res: Response) => {
  try {
    const catalog = await getGroupCatalogService(req.params.groupId);
    res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const updateGroupCatalogItem = async (req: Request, res: Response) => {
  try {
    const item = await updateGroupCatalogItemService(
      req.params.groupId,
      req.params.variantId,
      req.body,
    );
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
