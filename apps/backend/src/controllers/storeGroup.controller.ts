import { Request, Response } from "express";
import {
  createStoreGroupService,
  getStoreGroupsService,
  updateStoreGroupService,
} from "../service/storeGroup.service";

export const getStoreGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await getStoreGroupsService();
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createStoreGroup = async (req: Request, res: Response) => {
  try {
    const group = await createStoreGroupService(req.body);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const updateStoreGroup = async (req: Request, res: Response) => {
  try {
    const group = await updateStoreGroupService(req.params.id, req.body);
    res.status(200).json({ success: true, data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

