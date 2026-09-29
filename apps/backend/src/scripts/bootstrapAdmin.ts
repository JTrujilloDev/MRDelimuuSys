import "dotenv/config";
import bcrypt from "bcrypt";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || !email || !password) {
  throw new Error("ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required");
}

if (password.length < 10) {
  throw new Error("ADMIN_PASSWORD must contain at least 10 characters");
}

const main = async () => {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
    where: { email },
    create: {
      name,
      email,
      password: passwordHash,
      role: Role.ADMIN,
      isGlobalAdmin: true,
      isActive: true,
    },
    update: {
      name,
      password: passwordHash,
      role: Role.ADMIN,
      isGlobalAdmin: true,
      isActive: true,
    },
  });

    const stores = await tx.store.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    for (const store of stores) {
      await tx.userStoreAccess.upsert({
        where: { userId_storeId: { userId: user.id, storeId: store.id } },
        create: { userId: user.id, storeId: store.id, role: Role.ADMIN },
        update: { role: Role.ADMIN, isActive: true },
      });
    }

    console.log(`Administrator ${email} is active with access to ${stores.length} stores.`);
  });
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

