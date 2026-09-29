import { Request, Response } from "express";
import {
  createTerminalService,
  getTerminalsService,
  updateTerminalService,
} from "../service/terminal.service";

export const getTerminals = async (req: Request, res: Response) => {
  try {
    const terminals = await getTerminalsService(req.query.storeId);
    res.status(200).json({ success: true, data: terminals });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createTerminal = async (req: Request, res: Response) => {
  try {
    const terminal = await createTerminalService(req.body);
    res.status(201).json({
      success: true,
      message: "Terminal created successfully",
      data: terminal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateTerminal = async (req: Request, res: Response) => {
  try {
    const terminal = await updateTerminalService(req.params.id, req.body);
    res.status(200).json({ success: true, data: terminal });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
