import { createHash } from "node:crypto";
import { CookieOptions, Request, Response } from "express";

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "delimuu_session";

export const getSessionTtlHours = () => {
  const configured = Number(process.env.SESSION_TTL_HOURS || 12);
  return Number.isFinite(configured) && configured >= 1 && configured <= 168
    ? configured
    : 12;
};

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const readSessionToken = (req: Request) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex < 0) continue;
    const name = item.slice(0, separatorIndex).trim();
    if (name !== AUTH_COOKIE_NAME) continue;
    return decodeURIComponent(item.slice(separatorIndex + 1).trim());
  }
  return null;
};

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

export const setSessionCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: getSessionTtlHours() * 60 * 60 * 1000,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
};

