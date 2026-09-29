import { Request, Response } from "express";
import { clearSessionCookie, setSessionCookie } from "../auth/auth.cookie";
import {
  getSessionStateService,
  loginService,
  logoutService,
  selectSessionContextService,
} from "../service/auth.service";

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginService(req.body.email, req.body.password);
    setSessionCookie(res, result.rawToken);
    const { rawToken: _rawToken, ...response } = result;
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    const message = (error as Error).message;
    const status = message === "Invalid email or password" ? 401 : 403;
    res.status(status).json({ success: false, message });
  }
};

export const getCurrentSession = async (req: Request, res: Response) => {
  try {
    const state = await getSessionStateService(req.auth!.sessionId);
    res.status(200).json({ success: true, data: state });
  } catch (error) {
    res.status(401).json({ success: false, message: (error as Error).message });
  }
};

export const selectContext = async (req: Request, res: Response) => {
  try {
    const state = await selectSessionContextService(
      req.auth!.sessionId,
      req.body.storeId,
      req.body.terminalId,
    );
    res.status(200).json({ success: true, data: state });
  } catch (error) {
    res.status(403).json({ success: false, message: (error as Error).message });
  }
};

export const logout = async (req: Request, res: Response) => {
  await logoutService(req.auth!.sessionId);
  clearSessionCookie(res);
  res.status(204).send();
};

