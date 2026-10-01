CREATE TABLE "InventoryLot" (
  "id" SERIAL NOT NULL,
  "productVariantId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "manufacturedAt" DATE,
  "expiresAt" DATE,
  "isLegacy" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreLotInventory" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "inventoryLotId" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreLotInventory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryTransaction"
ADD COLUMN "inventoryLotId" INTEGER;

CREATE UNIQUE INDEX "InventoryLot_productVariantId_code_key"
ON "InventoryLot"("productVariantId", "code");
CREATE INDEX "InventoryLot_expiresAt_idx" ON "InventoryLot"("expiresAt");
CREATE UNIQUE INDEX "StoreLotInventory_storeId_inventoryLotId_key"
ON "StoreLotInventory"("storeId", "inventoryLotId");
CREATE INDEX "StoreLotInventory_storeId_stock_idx"
ON "StoreLotInventory"("storeId", "stock");
CREATE INDEX "StoreLotInventory_inventoryLotId_idx"
ON "StoreLotInventory"("inventoryLotId");
CREATE INDEX "InventoryTransaction_inventoryLotId_idx"
ON "InventoryTransaction"("inventoryLotId");

ALTER TABLE "InventoryLot"
ADD CONSTRAINT "InventoryLot_productVariantId_fkey"
FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreLotInventory"
ADD CONSTRAINT "StoreLotInventory_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StoreLotInventory"
ADD CONSTRAINT "StoreLotInventory_inventoryLotId_fkey"
FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_inventoryLotId_fkey"
FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "InventoryLot" (
  "productVariantId", "code", "isLegacy", "createdAt", "updatedAt"
)
SELECT DISTINCT
  inventory."productVariantId",
  'SIN-LOTE-HISTORICO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StoreInventory" inventory
WHERE inventory."stock" > 0
ON CONFLICT ("productVariantId", "code") DO NOTHING;

INSERT INTO "StoreLotInventory" (
  "storeId", "inventoryLotId", "stock", "createdAt", "updatedAt"
)
SELECT
  inventory."storeId",
  lot."id",
  inventory."stock",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StoreInventory" inventory
JOIN "InventoryLot" lot
  ON lot."productVariantId" = inventory."productVariantId"
  AND lot."code" = 'SIN-LOTE-HISTORICO'
WHERE inventory."stock" > 0
ON CONFLICT ("storeId", "inventoryLotId") DO NOTHING;
