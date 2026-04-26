/*
  Warnings:

  - You are about to alter the column `price` on the `AccountItem` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "AccountItem" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "wholesalePrice" DROP NOT NULL;
