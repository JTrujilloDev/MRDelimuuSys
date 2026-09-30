import { KitchenMode } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  requireCode,
  requireKitchenMode,
  requireName,
  requirePositiveId,
} from "./organization.validation";

type CreateStoreInput = {
  groupId: unknown;
  code: unknown;
  name: unknown;
  kitchenMode?: unknown;
};

type UpdateStoreInput = {
  groupId?: unknown;
  name?: unknown;
  isActive?: unknown;
  kitchenMode?: unknown;
};

export const getStoresService = (groupIdValue?: unknown) => {
  const groupId =
    groupIdValue === undefined
      ? undefined
      : requirePositiveId(groupIdValue, "groupId");

  return prisma.store.findMany({
    where: { groupId },
    include: {
      group: true,
      terminals: { orderBy: { name: "asc" } },
    },
    orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
  });
};

export const createStoreService = async (storeData: CreateStoreInput) => {
  const groupId = requirePositiveId(storeData.groupId, "groupId");
  const code = requireCode(storeData.code);
  const name = requireName(storeData.name);
  const kitchenMode =
    storeData.kitchenMode === undefined
      ? KitchenMode.NONE
      : requireKitchenMode(storeData.kitchenMode);

  const [group, existing] = await Promise.all([
    prisma.storeGroup.findUnique({ where: { id: groupId } }),
    prisma.store.findUnique({ where: { code } }),
  ]);

  if (!group || !group.isActive) throw new Error("Active store group not found");
  if (existing) throw new Error(`Store code "${code}" already exists`);

  return prisma.store.create({
    data: {
      groupId,
      code,
      name,
      kitchenMode,
    },
    include: { group: true, terminals: true },
  });
};

export const updateStoreService = async (
  idValue: unknown,
  storeData: UpdateStoreInput,
) => {
  const id = requirePositiveId(idValue, "storeId");
  const current = await prisma.store.findUnique({ where: { id } });
  if (!current) throw new Error("Store not found");

  if (storeData.isActive !== undefined && typeof storeData.isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }

  const groupId =
    storeData.groupId === undefined
      ? undefined
      : requirePositiveId(storeData.groupId, "groupId");
  if (groupId !== undefined) {
    const group = await prisma.storeGroup.findUnique({ where: { id: groupId } });
    if (!group || !group.isActive) throw new Error("Active store group not found");
  }

  if (storeData.isActive === false) {
    const openRegisters = await prisma.cashRegister.count({
      where: { terminal: { storeId: id }, status: "OPEN" },
    });
    if (openRegisters > 0) {
      const registerLabel = openRegisters === 1 ? "caja tiene" : "cajas tienen";
      throw new Error(
        `No se puede desactivar ${current.name}: ${openRegisters} ${registerLabel} un turno abierto. Cierra los turnos primero.`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (storeData.isActive === false) {
      await tx.userSession.updateMany({
        where: { activeStoreId: id },
        data: { activeStoreId: null, activeTerminalId: null },
      });
      await tx.terminal.updateMany({ where: { storeId: id }, data: { isActive: false } });
    }

    return tx.store.update({
      where: { id },
      data: {
        groupId,
        name: storeData.name === undefined ? undefined : requireName(storeData.name),
        isActive: storeData.isActive as boolean | undefined,
        kitchenMode:
          storeData.kitchenMode === undefined
            ? undefined
            : requireKitchenMode(storeData.kitchenMode),
      },
      include: { group: true, terminals: { orderBy: { name: "asc" } } },
    });
  });
};
