CREATE TYPE "PreparationArea" AS ENUM ('KITCHEN');

ALTER TABLE "ProductVariant"
ADD COLUMN "preparationArea" "PreparationArea" NOT NULL DEFAULT 'KITCHEN';
