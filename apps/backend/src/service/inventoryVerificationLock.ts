import { Prisma } from "../../generated/prisma/client";

// A short, transaction-scoped barrier: verification must not miss a product
// initialized concurrently. One common lock also avoids opposite-direction
// transfer deadlocks. It never remains held while a person counts in the UI.
export const lockInventoryVerificationTx = async (tx: Prisma.TransactionClient) => {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(72831903)::text`;
};
