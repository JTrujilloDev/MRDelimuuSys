import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AuthStoreOption } from "../auth/auth.types";
import { getSessionTtlHours, hashSessionToken } from "../auth/auth.cookie";
import { requirePositiveId } from "./organization.validation";

const normalizeEmail = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) throw new Error("Email is required");
  return value.trim().toLowerCase();
};

const requirePassword = (value: unknown) => {
  if (typeof value !== "string" || !value) throw new Error("Password is required");
  return value;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  isGlobalAdmin: true,
} as const;

const getAvailableStores = async (
  userId: number,
  isGlobalAdmin: boolean,
): Promise<AuthStoreOption[]> => {
  if (isGlobalAdmin) {
    const stores = await prisma.store.findMany({
      where: { isActive: true, group: { isActive: true } },
      include: { terminals: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
    });
    return stores.map((store) => ({ ...store, role: Role.ADMIN }));
  }

  const accesses = await prisma.userStoreAccess.findMany({
    where: {
      userId,
      isActive: true,
      store: { isActive: true, group: { isActive: true } },
    },
    include: {
      store: {
        include: { terminals: { where: { isActive: true }, orderBy: { name: "asc" } } },
      },
    },
    orderBy: { store: { name: "asc" } },
  });

  return accesses.map(({ store, role }) => ({ ...store, role }));
};

export const loginService = async (emailValue: unknown, passwordValue: unknown) => {
  const email = normalizeEmail(emailValue);
  const password = requirePassword(passwordValue);
  const userRecord = await prisma.user.findUnique({
    where: { email },
    select: { ...userSelect, password: true },
  });

  if (
    !userRecord ||
    !userRecord.isActive ||
    !(await bcrypt.compare(password, userRecord.password))
  ) {
    throw new Error("Invalid email or password");
  }

  const { password: _passwordHash, ...user } = userRecord;

  const stores = await getAvailableStores(user.id, user.isGlobalAdmin);
  if (!user.isGlobalAdmin && stores.length === 0) {
    throw new Error("User does not have access to an active store");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + getSessionTtlHours() * 60 * 60 * 1000);
  const session = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return tx.userSession.create({
      data: { tokenHash: hashSessionToken(rawToken), userId: user.id, expiresAt },
    });
  });

  return { rawToken, sessionId: session.id, user, stores, activeContext: null };
};

export const resolveSessionService = async (rawToken: string) => {
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(rawToken) },
    include: {
      user: { select: userSelect },
      activeStore: true,
      activeTerminal: true,
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }

  let storeRole: Role | null = null;
  if (session.activeStoreId) {
    if (session.user.isGlobalAdmin) {
      storeRole = Role.ADMIN;
    } else {
      const access = await prisma.userStoreAccess.findUnique({
        where: { userId_storeId: { userId: session.userId, storeId: session.activeStoreId } },
      });
      if (!access?.isActive) return null;
      storeRole = access.role;
    }
  }

  return { session, storeRole };
};

export const getSessionStateService = async (sessionId: string) => {
  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    include: { user: { select: userSelect }, activeStore: true, activeTerminal: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new Error("Session expired");
  }

  const stores = await getAvailableStores(session.userId, session.user.isGlobalAdmin);
  const activeStore = stores.find((store) => store.id === session.activeStoreId) ?? null;
  const activeTerminal =
    activeStore?.terminals.find((terminal) => terminal.id === session.activeTerminalId) ?? null;

  return {
    user: session.user,
    stores,
    activeContext:
      activeStore && activeTerminal
        ? { store: activeStore, terminal: activeTerminal, role: activeStore.role }
        : null,
  };
};

export const selectSessionContextService = async (
  sessionId: string,
  storeIdValue: unknown,
  terminalIdValue: unknown,
) => {
  const storeId = requirePositiveId(storeIdValue, "storeId");
  const terminalId = requirePositiveId(terminalIdValue, "terminalId");
  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    include: { user: { select: { isGlobalAdmin: true, isActive: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    throw new Error("Session expired");
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { group: true, terminals: { where: { id: terminalId, isActive: true } } },
  });
  if (!store || !store.isActive || !store.group.isActive || store.terminals.length !== 1) {
    throw new Error("Active store and terminal combination not found");
  }

  let role: Role = Role.ADMIN;
  if (!session.user.isGlobalAdmin) {
    const access = await prisma.userStoreAccess.findUnique({
      where: { userId_storeId: { userId: session.userId, storeId } },
    });
    if (!access?.isActive) throw new Error("User is not authorized for this store");
    role = access.role;
  }

  if (role === Role.KITCHEN && store.kitchenMode !== "TICKETS") {
    throw new Error("Kitchen access is not enabled for this store");
  }

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { activeStoreId: storeId, activeTerminalId: terminalId, lastSeenAt: new Date() },
  });

  return getSessionStateService(sessionId);
};

export const logoutService = (sessionId: string) =>
  prisma.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

