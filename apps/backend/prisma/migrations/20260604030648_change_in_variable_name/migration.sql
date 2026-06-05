/*
  Warnings:

  - You are about to drop the column `productVariantId` on the `RecipeItem` table. All the data in the column will be lost.
  - Added the required column `ingredientVariantId` to the `RecipeItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_productVariantId_fkey";

-- AlterTable
ALTER TABLE "RecipeItem" DROP COLUMN "productVariantId",
ADD COLUMN     "ingredientVariantId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientVariantId_fkey" FOREIGN KEY ("ingredientVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
