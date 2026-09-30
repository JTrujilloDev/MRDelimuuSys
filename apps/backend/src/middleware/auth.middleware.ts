import { NextFunction, Request, Response } from "express";
import { clearSessionCookie, readSessionToken } from "../auth/auth.cookie";
import { resolveSessionService } from "../service/auth.service";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = readSessionToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const resolved = await resolveSessionService(token);
    if (!resolved) {
      clearSessionCookie(res);
      res.status(401).json({ success: false, message: "Session expired" });
      return;
    }

    req.auth = {
      sessionId: resolved.session.id,
      userId: resolved.session.userId,
      isGlobalAdmin: resolved.session.user.isGlobalAdmin,
      activeStoreId: resolved.session.activeStoreId,
      activeTerminalId: resolved.session.activeTerminalId,
      storeRole: resolved.storeRole,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireGlobalAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.auth?.isGlobalAdmin) {
    res.status(403).json({ success: false, message: "Global administrator access required" });
    return;
  }
  next();
};

export const requireActiveContext = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.auth?.activeStoreId || !req.auth.activeTerminalId || !req.auth.storeRole) {
    res.status(409).json({ success: false, message: "Select an active store and terminal" });
    return;
  }
  next();
};

export const requireInventoryManager = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.auth?.isGlobalAdmin && req.auth?.storeRole !== "ADMIN") {
    res.status(403).json({ success: false, message: "Inventory manager access required" });
    return;
  }
  next();
};

