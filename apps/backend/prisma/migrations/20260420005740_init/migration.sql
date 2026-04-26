/*
  Warnings:

  - You are about to alter the column `total` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `discount` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `AccountItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `openingAmount` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `closingAmount` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `difference` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `cardAmount` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `cashAmount` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `creditAmount` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `qrAmount` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `totalDiscounts` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `totalExpenses` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `totalSales` on the `CashRegister` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `retailPrice` on the `ProductVariant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `wholesalePrice` on the `ProductVariant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `productCost` on the `ProductVariant` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - A unique constraint covering the columns `[accountId,productVariantId]` on the table `AccountItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "discount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "financialTransactionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AccountItem" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CashRegister" ALTER COLUMN "openingAmount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "closingAmount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "difference" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "cardAmount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "cashAmount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "creditAmount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "qrAmount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalDiscounts" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalExpenses" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalSales" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FinancialTransaction" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "requirePreparation" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "retailPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "wholesalePrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "productCost" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "AccountItem_accountId_productVariantId_key" ON "AccountItem"("accountId", "productVariantId");
