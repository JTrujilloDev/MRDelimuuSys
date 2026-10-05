import { Request, Response } from "express";
import {
  createFinancialTransactionService,
  getFinancialTransactionsService,
  voidExpenseService,
} from "../service/financial.service";

export const createFinancialTransaction = async (
  req: Request,
  res: Response,
) => {
  try {
    const transaction = await createFinancialTransactionService({ ...req.body,
      relatedCashRegisterId: req.auth!.openCashRegisterId, relatedAccountId: null,
      createdByUserId: req.auth!.userId,
    });
    res.status(201).json({
      success: true,
      message: "Financial transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const voidExpense = async (req: Request, res: Response) => {
  try {
    const data = await voidExpenseService(Number(req.params.id), req.auth!.openCashRegisterId!, req.auth!.userId, req.body.reason);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const getFinancialTransactions = async (req: Request, res: Response) => {
  try {
   
    const transactions = await getFinancialTransactionsService(
      req.query,
      req.auth!.activeStoreId!,
    );
    res.status(200).json({
      success: true,
      message: "Financial transactions fetched successfully",
      data: transactions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
