import { Request, Response } from "express";
import { getIO } from "../socket";
import {
  createInventoryTransferService,
  getInventoryTransferDestinationsService,
  getInventoryTransfersService,
  receiveInventoryTransferService,
} from "../service/inventoryTransfer.service";

export const getInventoryTransferDestinations = async (req: Request, res: Response) => {
  try {
    const destinations = await getInventoryTransferDestinationsService(req.auth!.activeStoreId!);
    res.status(200).json({ success: true, data: destinations });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const getInventoryTransfers = async (req: Request, res: Response) => {
  try {
    const transfers = await getInventoryTransfersService(req.auth!.activeStoreId!);
    res.status(200).json({ success: true, data: transfers });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createInventoryTransfer = async (req: Request, res: Response) => {
  try {
    const transfer = await createInventoryTransferService(
      req.body,
      req.auth!.activeStoreId!,
      req.auth!.userId,
    );
    getIO().emit("inventory:updated");
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const receiveInventoryTransfer = async (req: Request, res: Response) => {
  try {
    const transfer = await receiveInventoryTransferService(
      req.params.transferId,
      req.body,
      req.auth!.activeStoreId!,
      req.auth!.userId,
    );
    getIO().emit("inventory:updated");
    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
