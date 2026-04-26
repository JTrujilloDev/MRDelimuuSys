-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "discountObservation" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AccountItem" ADD COLUMN     "subtotal" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN     "relatedAccountId" INTEGER;
