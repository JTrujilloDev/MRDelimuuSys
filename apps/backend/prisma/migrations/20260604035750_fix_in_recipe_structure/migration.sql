/*
  Warnings:

  - You are about to drop the `SaleRecipe` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_saleRecipeId_fkey";

-- DropForeignKey
ALTER TABLE "SaleRecipe" DROP CONSTRAINT "SaleRecipe_productVariantId_fkey";

-- DropTable
DROP TABLE "SaleRecipe";
