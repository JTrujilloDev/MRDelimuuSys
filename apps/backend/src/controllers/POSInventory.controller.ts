import { Request, Response } from "express";
import {
  createBulkPOSInventoryTransactionService,
  createPOSInventoryTransactionService,
  getPOSInventoryTransactionsService,
} from "../service/POSInventory.service";

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

export const createBulkPOSInventoryTransaction = async (
  req: Request,
  res: Response,
) => {
  try {
    const transactions = await createBulkPOSInventoryTransactionService(req.body);
    res.status(201).json({
      success: true,
      message: "Inventory transactions created successfully",
      data: transactions,
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
    const parseDate = (value: unknown) => {
      if (typeof value !== "string" || !value) return undefined;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date;
    };
    const result = await getPOSInventoryTransactionsService({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      type: typeof req.query.type === "string" ? req.query.type : undefined,
      origin:
        req.query.origin === "MANUAL" || req.query.origin === "POS"
          ? req.query.origin
          : "ALL",
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
    });
    res.status(200).json({
      success: true,
      message: "Inventory transactions fetched successfully",
      data: result.operations,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
