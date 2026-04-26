/*
  Warnings:

  - You are about to alter the column `amount` on the `FinancialTransaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.

*/
-- AlterEnum
ALTER TYPE "FinancialTransactionType" ADD VALUE 'OPENING';

-- AlterTable
ALTER TABLE "FinancialTransaction" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "productCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
