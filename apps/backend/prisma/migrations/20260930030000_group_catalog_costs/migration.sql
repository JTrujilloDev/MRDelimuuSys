ALTER TABLE "GroupCatalogItem"
ADD COLUMN "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "GroupCatalogItem" catalog
SET "costPrice" = variant."productCost"
FROM "ProductVariant" variant
WHERE variant."id" = catalog."productVariantId";

ALTER TABLE "AccountItem"
ADD COLUMN "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Existing sales predate group-specific costs. The master cost is the best available historical reference.
UPDATE "AccountItem" item
SET "unitCost" = variant."productCost"
FROM "ProductVariant" variant
WHERE variant."id" = item."productVariantId";
