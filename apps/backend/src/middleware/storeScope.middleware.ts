import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const requireAccountInActiveStore = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let accountId = Number(req.body.accountId ?? req.params.id);

    if (!Number.isInteger(accountId) && req.body.accountItemId) {
      const item = await prisma.accountItem.findUnique({
        where: { id: Number(req.body.accountItemId) },
        select: { accountId: true },
      });
      accountId = item?.accountId ?? Number.NaN;
    }

    if (!Number.isInteger(accountId) || accountId <= 0) {
      res.status(400).json({ success: false, message: "Valid account reference required" });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { terminal: { select: { storeId: true } } },
    });
    if (!account) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }
    if (account.terminal.storeId !== req.auth!.activeStoreId) {
      res.status(403).json({ success: false, message: "Account belongs to another store" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireCashRegisterInActiveStore = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const cashRegisterId = Number(
      req.body.cashRegisterId ?? req.body.relatedCashRegisterId ?? req.params.id,
    );
    if (!Number.isInteger(cashRegisterId) || cashRegisterId <= 0) {
      res.status(400).json({ success: false, message: "Valid cash register required" });
      return;
    }

    const register = await prisma.cashRegister.findUnique({
      where: { id: cashRegisterId },
      select: { terminal: { select: { storeId: true } } },
    });
    if (!register) {
      res.status(404).json({ success: false, message: "Cash register not found" });
      return;
    }
    if (register.terminal.storeId !== req.auth!.activeStoreId) {
      res.status(403).json({ success: false, message: "Cash register belongs to another store" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireKitchenEnabled = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.auth!.activeStoreId! },
      select: { kitchenMode: true, isActive: true },
    });
    if (!store?.isActive || store.kitchenMode !== "TICKETS") {
      res.status(403).json({ success: false, message: "Kitchen is not enabled for this store" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

