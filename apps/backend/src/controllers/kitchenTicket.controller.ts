import { Request, Response } from "express";
import { KitchenTicketStatus } from "../../generated/prisma/enums";
import { getIO } from "../socket";
import { acknowledgeKitchenTicketAdjustmentService, createKitchenTicketAdjustmentService, createKitchenTicketService, getKitchenTicketsService, updateKitchenTicketStatusService } from "../service/kitchenTicket.service";

export const getKitchenTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await getKitchenTicketsService(req.query.accountId ? Number(req.query.accountId) : undefined);
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createKitchenTicket = async (req: Request, res: Response) => {
  try {
    const ticket = await createKitchenTicketService(req.body);
    getIO().emit("kitchen-ticket:created", ticket);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const updateKitchenTicketStatus = async (req: Request, res: Response) => {
  try {
    const status = String(req.body.status) as KitchenTicketStatus;
    if (!Object.values(KitchenTicketStatus).includes(status)) throw new Error("Invalid kitchen ticket status");
    const ticket = await updateKitchenTicketStatusService(Number(req.params.id), status);
    getIO().emit("kitchen-ticket:updated", ticket);
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const createKitchenTicketAdjustment = async (req: Request, res: Response) => {
  try {
    const adjustment = await createKitchenTicketAdjustmentService(req.body);
    getIO().emit("kitchen-ticket:adjusted", adjustment);
    res.status(201).json({ success: true, data: adjustment });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const acknowledgeKitchenTicketAdjustment = async (req: Request, res: Response) => {
  try {
    const adjustment = await acknowledgeKitchenTicketAdjustmentService(Number(req.params.adjustmentId));
    getIO().emit("kitchen-ticket:adjustment-acknowledged", adjustment);
    res.json({ success: true, data: adjustment });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
