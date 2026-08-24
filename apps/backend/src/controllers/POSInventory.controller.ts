import { Request, Response } from "express";
import { createPOSInventoryTransactionService, getPOSInventoryTransactionsService } from "../service/POSInventory.service";

export const createPOSInventoryTransaction = async (
  req: Request,
  res: Response,
) => {
  try {
    const transaction = await createPOSInventoryTransactionService(req.body);
    res.status(201).json({
      success: true,
      message: "Inventory transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getPOSInventoryTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await getPOSInventoryTransactionsService();
    res.status(200).json({
      success: true,
      message: "Inventory transactions fetched successfully",
      data: transactions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
