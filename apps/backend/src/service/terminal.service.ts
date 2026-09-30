import { prisma } from "../../lib/prisma";
import { requireCode, requireName, requirePositiveId } from "./organization.validation";

type CreateTerminalInput = {
  storeId: unknown;
  code: unknown;
  name: unknown;
};

type UpdateTerminalInput = {
  name?: unknown;
  isActive?: unknown;
};

export const getTerminalsService = (storeIdValue?: unknown) => {
  const storeId =
    storeIdValue === undefined
      ? undefined
      : requirePositiveId(storeIdValue, "storeId");

  return prisma.terminal.findMany({
    where: { storeId },
    include: { store: { include: { group: true } } },
    orderBy: [{ store: { name: "asc" } }, { name: "asc" }],
  });
};

export const createTerminalService = async (terminalData: CreateTerminalInput) => {
  const storeId = requirePositiveId(terminalData.storeId, "storeId");
  const code = requireCode(terminalData.code);
  const name = requireName(terminalData.name);
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { group: true },
  });

  if (!store || !store.isActive || !store.group.isActive) {
    throw new Error("Active store not found");
  }

  const existing = await prisma.terminal.findUnique({
    where: { storeId_code: { storeId, code } },
  });
  if (existing) throw new Error(`Terminal code "${code}" already exists in this store`);

  return prisma.terminal.create({
    data: {
      name,
      code,
      storeId,
    },
    include: { store: { include: { group: true } } },
  });
};

export const updateTerminalService = async (
  idValue: unknown,
  terminalData: UpdateTerminalInput,
) => {
  const id = requirePositiveId(idValue, "terminalId");
  const current = await prisma.terminal.findUnique({ where: { id } });
  if (!current) throw new Error("Terminal not found");

  if (terminalData.isActive !== undefined && typeof terminalData.isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }

  if (terminalData.isActive === false) {
    const openRegister = await prisma.cashRegister.findFirst({
      where: { terminalId: id, status: "OPEN" },
      select: { id: true },
    });
    if (openRegister) throw new Error("Close the cash register before deactivating the terminal");
  }

  if (terminalData.isActive === true) {
    const store = await prisma.store.findUnique({
      where: { id: current.storeId },
      include: { group: true },
    });
    if (!store?.isActive || !store.group.isActive) {
      throw new Error("The store and its group must be active before activating the terminal");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (terminalData.isActive === false) {
      await tx.userSession.updateMany({
        where: { activeTerminalId: id },
        data: { activeStoreId: null, activeTerminalId: null },
      });
    }

    return tx.terminal.update({
      where: { id },
      data: {
        name: terminalData.name === undefined ? undefined : requireName(terminalData.name),
        isActive: terminalData.isActive as boolean | undefined,
      },
      include: { store: { include: { group: true } } },
    });
  });
};
