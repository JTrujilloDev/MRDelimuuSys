import { Request, Response } from "express";
import {
  closeCashRegisterService,
  createCashRegisterService,
  getAllCashRegistersService,
  getCashRegisterHistoryService,
  getOpenCashRegisterService,
} from "../service/cashRegister.service";

export const getCashRegisterHistory = async (req: Request, res: Response) => {
  try {
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      res.status(400).json({ success: false, message: "from and to must be valid dates" });
      return;
    }
    if (from > to) {
      res.status(400).json({ success: false, message: "from cannot be after to" });
      return;
    }

    const result = await getCashRegisterHistoryService(from, to);
    res.status(200).json({
      success: true,
      message: "Cash register history fetched successfully",
      data: result.cashRegisters,
      soldProducts: result.soldProducts,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createCashRegister = async (req: Request, res: Response) => {
  try {
    const cashRegister = await createCashRegisterService(req.body);
    res.status(201).json({
      success: true,
      message: "Cash register created successfully",
      data: cashRegister,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getAllCashRegisters = async (req: Request, res: Response) => {
  try {
    const cashRegisters = await getAllCashRegistersService();
    res.status(200).json({
      success: true,
      message: "Cash registers fetched successfully",
      data: cashRegisters,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const closeCashRegister = async (req: Request, res: Response) => {
  try {
    const { cashRegisterId, closingAmount } = req.body;
    const closedCashRegister = await closeCashRegisterService(
      cashRegisterId,
      closingAmount,
    );
    res.status(200).json({
      success: true,
      message: "Cash register closed successfully",
      data: closedCashRegister,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getOpenCashRegister = async (req: Request, res: Response) => {
  try {
    const { terminalId } = req.params;
    const openCashRegister = await getOpenCashRegisterService(
      Number(terminalId),
    );
    res.status(200).json({
      success: true,
      message: "Open cash register fetched successfully",
      data: openCashRegister,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};




