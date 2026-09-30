-- Temporary manual receipt type until the production and dispatch module creates these movements.
ALTER TYPE "InventoryTransactionType" ADD VALUE 'RECEIPT';

-- Commercial catalog is shared by every point in a StoreGroup.
CREATE TABLE "GroupCatalogItem" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "productVariantId" INTEGER NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCatalogItem_pkey" PRIMARY KEY ("id")
);

-- Physical stock belongs to a point, never to the shared catalog.
CREATE TABLE "StoreInventory" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productVariantId" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isInitialized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreInventory_pkey" PRIMARY KEY ("id")
);

-- Every historical movement belongs to Delimuu. New movements also record their author.
ALTER TABLE "InventoryTransaction"
ADD COLUMN "storeId" INTEGER,
ADD COLUMN "createdByUserId" INTEGER;

UPDATE "InventoryTransaction"
SET "storeId" = (SELECT "id" FROM "Store" WHERE "code" = 'DELIMUU_MAIN');

ALTER TABLE "InventoryTransaction"
ALTER COLUMN "storeId" SET NOT NULL;

-- Preserve the existing commercial setup as Delimuu's initial catalog.
INSERT INTO "GroupCatalogItem" (
    "groupId",
    "productVariantId",
    "salePrice",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    store_group."id",
    variant."id",
    variant."retailPrice",
    variant."isActive",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "StoreGroup" store_group
CROSS JOIN "ProductVariant" variant
WHERE store_group."code" = 'DELIMUU';

-- Existing balances belong to Delimuu. Every other point starts at zero.
INSERT INTO "StoreInventory" (
    "storeId",
    "productVariantId",
    "stock",
    "minStock",
    "isInitialized",
    "createdAt",
    "updatedAt"
)
SELECT
    store_row."id",
    variant."id",
    CASE WHEN store_row."code" = 'DELIMUU_MAIN' THEN variant."stock" ELSE 0 END,
    CASE WHEN store_row."code" = 'DELIMUU_MAIN' THEN variant."minStock" ELSE 0 END,
    CASE WHEN store_row."code" = 'DELIMUU_MAIN' THEN NOT variant."isNew" ELSE false END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Store" store_row
CROSS JOIN "ProductVariant" variant;

CREATE UNIQUE INDEX "GroupCatalogItem_groupId_productVariantId_key"
ON "GroupCatalogItem"("groupId", "productVariantId");
CREATE INDEX "GroupCatalogItem_groupId_isActive_idx"
ON "GroupCatalogItem"("groupId", "isActive");
CREATE UNIQUE INDEX "StoreInventory_storeId_productVariantId_key"
ON "StoreInventory"("storeId", "productVariantId");
CREATE INDEX "StoreInventory_storeId_stock_idx"
ON "StoreInventory"("storeId", "stock");
CREATE INDEX "InventoryTransaction_storeId_createdAt_idx"
ON "InventoryTransaction"("storeId", "createdAt");
CREATE INDEX "InventoryTransaction_createdByUserId_idx"
ON "InventoryTransaction"("createdByUserId");

ALTER TABLE "GroupCatalogItem"
ADD CONSTRAINT "GroupCatalogItem_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "StoreGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GroupCatalogItem"
ADD CONSTRAINT "GroupCatalogItem_productVariantId_fkey"
FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreInventory"
ADD CONSTRAINT "StoreInventory_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StoreInventory"
ADD CONSTRAINT "StoreInventory_productVariantId_fkey"
FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
