-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('UNIT', 'GRAM', 'KILOGRAM', 'LITER', 'MILLILITER', 'PIECE', 'BOX', 'PACK');

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "unit" "Unit" NOT NULL DEFAULT 'UNIT';
