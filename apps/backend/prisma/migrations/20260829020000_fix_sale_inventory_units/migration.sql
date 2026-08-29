UPDATE "InventoryTransaction" AS transaction
SET "unit" = variant."unit"
FROM "ProductVariant" AS variant
WHERE transaction."productVariantId" = variant."id"
  AND transaction."type" = 'SALE'
  AND transaction."unit" IS DISTINCT FROM variant."unit";
