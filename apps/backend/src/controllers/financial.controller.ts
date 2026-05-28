import { Request, Response } from "express";
import {
  createFinancialTransactionService,
  getFinancialTransactionsService,
} from "../service/financial.service";

export const createFinancialTransaction = async (
  req: Request,
  res: Response,
) => {
  try {
    const transaction = await createFinancialTransactionService(req.body);
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

export const getFinancialTransactions = async (req: Request, res: Response) => {
  try {
   
    const transactions = await getFinancialTransactionsService( req.query);
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
