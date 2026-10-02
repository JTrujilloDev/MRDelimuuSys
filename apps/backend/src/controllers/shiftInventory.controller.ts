import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getShiftInventory, saveShiftInventoryItem, confirmShiftInventory, reopenFinalCount, resolveShiftInventoryItem } from "../service/shiftInventory.service";

export const readInventoryCount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Turno inválido.");
    const register = await prisma.cashRegister.findFirst({ where: { id, terminal: { storeId: req.auth!.activeStoreId! } } });
    if (!register || (register.userId !== req.auth!.userId && !req.auth!.isGlobalAdmin && req.auth!.storeRole !== "ADMIN")) {
      res.status(403).json({ success: false, message: "No tienes acceso al conteo de este turno." }); return;
    }
    res.json({ success: true, data: await getShiftInventory(id, req.auth!.activeStoreId!) });
  } catch (error) { res.status(400).json({ success: false, message: (error as Error).message }); }
};

export const mutateInventoryCount = (action: "item" | "confirm" | "reopen") => async (req: Request, res: Response) => {
  try {
    const id = req.auth!.openCashRegisterId!;
    const store = req.auth!.activeStoreId!;
    const user = req.auth!.userId;
    const data = action === "item" ? await saveShiftInventoryItem(id, store, user, req.body)
      : action === "confirm" ? await confirmShiftInventory(id, store, user, req.body.phase)
      : await reopenFinalCount(id, store);
    res.json({ success: true, data });
  } catch (error) { res.status(409).json({ success: false, message: (error as Error).message }); }
};

export const resolveInventoryCount = async (req: Request, res: Response) => {
  if (!req.auth!.isGlobalAdmin) { res.status(403).json({ success: false, message: "Solo el administrador general puede resolver diferencias." }); return; }
  try {
    const id = Number(req.params.itemId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Diferencia inválida.");
    res.json({ success: true, data: await resolveShiftInventoryItem(id, req.auth!.activeStoreId!, req.auth!.userId, req.body) });
  } catch (error) { res.status(409).json({ success: false, message: (error as Error).message }); }
};
