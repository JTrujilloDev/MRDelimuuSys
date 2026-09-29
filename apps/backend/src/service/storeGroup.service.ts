import { prisma } from "../../lib/prisma";
import { requireCode, requireName, requirePositiveId } from "./organization.validation";

type CreateStoreGroupInput = {
  code: unknown;
  name: unknown;
};

type UpdateStoreGroupInput = {
  name?: unknown;
  isActive?: unknown;
};

export const getStoreGroupsService = () =>
  prisma.storeGroup.findMany({
    include: {
      stores: {
        orderBy: { name: "asc" },
        include: { terminals: { orderBy: { name: "asc" } } },
      },
    },
    orderBy: { name: "asc" },
  });

export const createStoreGroupService = async (data: CreateStoreGroupInput) => {
  const code = requireCode(data.code);
  const name = requireName(data.name);

  const existing = await prisma.storeGroup.findUnique({ where: { code } });
  if (existing) throw new Error(`Store group code "${code}" already exists`);

  return prisma.storeGroup.create({ data: { code, name } });
};

export const updateStoreGroupService = async (
  idValue: unknown,
  data: UpdateStoreGroupInput,
) => {
  const id = requirePositiveId(idValue, "groupId");
  const current = await prisma.storeGroup.findUnique({ where: { id } });
  if (!current) throw new Error("Store group not found");

  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }

  const name = data.name === undefined ? undefined : requireName(data.name);

  if (data.isActive === false) {
    const activeStores = await prisma.store.count({
      where: { groupId: id, isActive: true },
    });
    if (activeStores > 0) {
      throw new Error("Deactivate the group's stores before deactivating the group");
    }
  }

  return prisma.storeGroup.update({
    where: { id },
    data: { name, isActive: data.isActive as boolean | undefined },
  });
};

