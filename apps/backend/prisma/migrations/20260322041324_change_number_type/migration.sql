/*
  Warnings:

  - You are about to alter the column `price` on the `AccountItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - You are about to alter the column `subtotal` on the `AccountItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "AccountItem" ALTER COLUMN "price" SET DATA TYPE INTEGER,
ALTER COLUMN "subtotal" SET DATA TYPE INTEGER;
