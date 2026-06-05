/*
  Warnings:

  - Added the required column `recipeVariantId` to the `RecipeItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_ingredientVariantId_fkey";

-- AlterTable
ALTER TABLE "RecipeItem" ADD COLUMN     "recipeVariantId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeVariantId_fkey" FOREIGN KEY ("recipeVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientVariantId_fkey" FOREIGN KEY ("ingredientVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
