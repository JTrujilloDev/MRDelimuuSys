import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const requireOpenShiftOperator = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const register = await prisma.cashRegister.findFirst({
      where: {
        terminalId: req.auth!.activeTerminalId!,
        status: "OPEN",
      },
      select: { id: true, userId: true },
    });

    if (!register) {
      res.status(409).json({ success: false, message: "Open a shift before operating the POS" });
      return;
    }

    const requestedRegisterId = Number(
      req.body.cashRegisterId ?? req.body.relatedCashRegisterId,
    );
    if (
      Number.isInteger(requestedRegisterId) &&
      requestedRegisterId > 0 &&
      requestedRegisterId !== register.id
    ) {
      res.status(403).json({ success: false, message: "Cash register does not belong to the active terminal" });
      return;
    }

    const canManageAnyShift =
      req.auth!.isGlobalAdmin || req.auth!.storeRole === "ADMIN";
    if (register.userId !== req.auth!.userId && !canManageAnyShift) {
      res.status(403).json({ success: false, message: "This shift belongs to another user" });
      return;
    }

    req.auth!.openCashRegisterId = register.id;
    next();
  } catch (error) {
    next(error);
  }
};
