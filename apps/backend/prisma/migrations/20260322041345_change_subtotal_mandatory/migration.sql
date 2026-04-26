/*
  Warnings:

  - Made the column `subtotal` on table `AccountItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AccountItem" ALTER COLUMN "subtotal" SET NOT NULL;
