import { Request, Response } from "express";
import { createStoreService } from "../service/store.service";
import { createTerminalService } from "../service/terminal.service";

export const createTerminal = async (req: Request, res: Response) => {
    try {
    const store = await createTerminalService(req.body);
    res.status(201).json({
        success: true,
        message: "Terminal created successfully",
        data: store,
    });
    } catch (error) {
    res.status(400).json({
        success: false,
        message: (error as Error).message,
    });
    }
}