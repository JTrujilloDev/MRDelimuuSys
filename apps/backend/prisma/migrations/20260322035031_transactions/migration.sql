/*
  Warnings:

  - You are about to drop the column `cashRegisterId` on the `FinancialTransaction` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "FinancialTransactionType" ADD VALUE 'ADJUSTMENT';

-- DropForeignKey
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_cashRegisterId_fkey";

-- AlterTable
ALTER TABLE "FinancialTransaction" DROP COLUMN "cashRegisterId",
ADD COLUMN     "adjustmentJustification" TEXT,
ADD COLUMN     "relatedAccountId" INTEGER,
ADD COLUMN     "relatedCashRegisterId" INTEGER;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_relatedCashRegisterId_fkey" FOREIGN KEY ("relatedCashRegisterId") REFERENCES "CashRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;
