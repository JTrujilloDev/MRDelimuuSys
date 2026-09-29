import bcrypt from "bcrypt";
import { KitchenMode, Role } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { requireName, requirePositiveId } from "./organization.validation";

const manageableRoles = new Set<Role>([Role.ADMIN, Role.CASHIER, Role.KITCHEN]);

type StoreAccessInput = {
  storeId: unknown;
  role: unknown;
};

type CreateUserInput = {
  name: unknown;
  email: unknown;
  password: unknown;
  isGlobalAdmin?: unknown;
  accesses?: StoreAccessInput[];
};

type UpdateUserInput = Partial<CreateUserInput> & {
  isActive?: unknown;
};

const requireEmail = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) throw new Error("email is required");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
  return email;
};

const requirePassword = (value: unknown) => {
  if (typeof value !== "string" || value.length < 10) {
    throw new Error("Password must contain at least 10 characters");
  }
  return value;
};

const requireBoolean = (value: unknown, field: string) => {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
  return value;
};

const normalizeAccesses = async (accessesValue: unknown, isGlobalAdmin: boolean) => {
  if (accessesValue === undefined && isGlobalAdmin) return [];
  if (!Array.isArray(accessesValue)) throw new Error("accesses must be an array");
  if (!isGlobalAdmin && accessesValue.length === 0) {
    throw new Error("A non-administrator must have access to at least one store");
  }

  const accesses = accessesValue.map((value) => {
    const access = value as StoreAccessInput;
    const storeId = requirePositiveId(access.storeId, "storeId");
    if (!manageableRoles.has(access.role as Role)) throw new Error("Invalid store role");
    return { storeId, role: access.role as Role };
  });

  if (new Set(accesses.map(({ storeId }) => storeId)).size !== accesses.length) {
    throw new Error("A store cannot be assigned more than once");
  }

  const stores = await prisma.store.findMany({
    where: { id: { in: accesses.map(({ storeId }) => storeId) } },
    select: { id: true, isActive: true, kitchenMode: true, group: { select: { isActive: true } } },
  });
  if (stores.length !== accesses.length) throw new Error("One or more stores were not found");

  for (const access of accesses) {
    const store = stores.find(({ id }) => id === access.storeId)!;
    if (!store.isActive || !store.group.isActive) throw new Error("Users can only be assigned to active stores");
    if (access.role === Role.KITCHEN && store.kitchenMode !== KitchenMode.TICKETS) {
      throw new Error("Kitchen role can only be assigned to a store with kitchen tickets enabled");
    }
  }

  return accesses;
};

const userResult = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  isGlobalAdmin: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  storeAccesses: {
    include: { store: { include: { group: true } } },
    orderBy: { store: { name: "asc" as const } },
  },
} as const;

export const createUserService = async (userData: CreateUserInput) => {
  const name = requireName(userData.name);
  const email = requireEmail(userData.email);
  const password = requirePassword(userData.password);
  const isGlobalAdmin =
    userData.isGlobalAdmin === undefined
      ? false
      : requireBoolean(userData.isGlobalAdmin, "isGlobalAdmin");
  const accesses = await normalizeAccesses(userData.accesses, isGlobalAdmin);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error(`User with email "${email}" already exists`);

  const hashedPassword = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      isGlobalAdmin,
      role: isGlobalAdmin ? Role.ADMIN : accesses[0].role,
      storeAccesses: { create: accesses },
    },
    select: userResult,
  });
};

export const getAllUsersService = () =>
  prisma.user.findMany({ select: userResult, orderBy: { name: "asc" } });

export const deactivateUserService = async (idValue: unknown) => {
  const id = requirePositiveId(idValue, "userId");
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new Error("User not found");

  return prisma.$transaction(async (tx) => {
    await tx.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tx.user.update({ where: { id }, data: { isActive: false }, select: userResult });
  });
};

export const updateUserService = async (idValue: unknown, data: UpdateUserInput) => {
  const id = requirePositiveId(idValue, "userId");
  const current = await prisma.user.findUnique({
    where: { id },
    include: { storeAccesses: true },
  });
  if (!current) throw new Error("User not found");

  const isGlobalAdmin =
    data.isGlobalAdmin === undefined
      ? current.isGlobalAdmin
      : requireBoolean(data.isGlobalAdmin, "isGlobalAdmin");
  const accesses =
    data.accesses === undefined
      ? undefined
      : await normalizeAccesses(data.accesses, isGlobalAdmin);
  if (!isGlobalAdmin && accesses === undefined && current.storeAccesses.every(({ isActive }) => !isActive)) {
    throw new Error("A non-administrator must have access to at least one store");
  }

  const isActive =
    data.isActive === undefined ? undefined : requireBoolean(data.isActive, "isActive");
  const password =
    data.password === undefined ? undefined : await bcrypt.hash(requirePassword(data.password), 12);
  const fallbackRole = accesses?.[0]?.role ?? current.role;

  return prisma.$transaction(async (tx) => {
    if (accesses !== undefined) {
      await tx.userStoreAccess.deleteMany({ where: { userId: id } });
      if (accesses.length) {
        await tx.userStoreAccess.createMany({
          data: accesses.map((access) => ({ ...access, userId: id })),
        });
      }
    }

    if (isActive === false) {
      await tx.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return tx.user.update({
      where: { id },
      data: {
        name: data.name === undefined ? undefined : requireName(data.name),
        email: data.email === undefined ? undefined : requireEmail(data.email),
        password,
        isActive,
        isGlobalAdmin,
        role: isGlobalAdmin ? Role.ADMIN : fallbackRole,
      },
      select: userResult,
    });
  });
};

