-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryTransactionType" ADD VALUE 'INITIAL';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'WHOLESALE';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'INTERNAL_CONSUMPTION';
