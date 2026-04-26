import { Store } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export const createStoreService = async (storeData: Store) => {
  const store = await prisma.store.create({
    data: {
      name: storeData.name,
    },
  });
  return store;
};
