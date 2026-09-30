import { Request, Response } from "express";
import {
  deleteGroupCatalogItemService,
  getGroupCatalogService,
  updateGroupCatalogItemService,
} from "../service/catalog.service";

export const getGroupCatalog = async (req: Request, res: Response) => {
  try {
    const catalog = await getGroupCatalogService(req.params.groupId, {
      isGlobalAdmin: Boolean(req.auth?.isGlobalAdmin),
      activeStoreId: req.auth?.activeStoreId,
      storeRole: req.auth?.storeRole,
    });
    res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const deleteGroupCatalogItem = async (req: Request, res: Response) => {
  try {
    const item = await deleteGroupCatalogItemService(
      req.params.groupId,
      req.params.variantId,
    );
    res.status(200).json({ success: true, data: item });
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
