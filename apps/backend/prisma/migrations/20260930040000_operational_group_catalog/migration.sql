ALTER TABLE "GroupCatalogItem"
ALTER COLUMN "salePrice" DROP NOT NULL;

ALTER TABLE "GroupCatalogItem"
RENAME COLUMN "isActive" TO "isPosActive";

ALTER INDEX "GroupCatalogItem_groupId_isActive_idx"
RENAME TO "GroupCatalogItem_groupId_isPosActive_idx";

-- Materials belong to the operational catalog but are never offered directly in the POS.
UPDATE "GroupCatalogItem" catalog
SET "salePrice" = NULL,
    "isPosActive" = false
FROM "ProductVariant" variant
JOIN "Product" product ON product."id" = variant."productId"
WHERE catalog."productVariantId" = variant."id"
  AND product."productType" IN ('INGREDIENT', 'PACKAGING', 'PREPARED_BASE');
