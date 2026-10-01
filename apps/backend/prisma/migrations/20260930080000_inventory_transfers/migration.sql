ALTER TYPE "InventoryTransactionType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'TRANSFER_IN';

CREATE TYPE "InventoryTransferStatus" AS ENUM ('DISPATCHED', 'RECEIVED');

CREATE TABLE "InventoryTransfer" (
  "id" SERIAL NOT NULL,
  "groupId" INTEGER NOT NULL,
  "originStoreId" INTEGER NOT NULL,
  "destinationStoreId" INTEGER NOT NULL,
  "status" "InventoryTransferStatus" NOT NULL DEFAULT 'DISPATCHED',
  "dispatchedByUserId" INTEGER NOT NULL,
  "receivedByUserId" INTEGER,
  "dispatchObservation" TEXT,
  "receptionObservation" TEXT,
  "discrepancyReason" TEXT,
  "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryTransferItem" (
  "id" SERIAL NOT NULL,
  "transferId" INTEGER NOT NULL,
  "productVariantId" INTEGER NOT NULL,
  "inventoryLotId" INTEGER NOT NULL,
  "quantitySent" INTEGER NOT NULL,
  "quantityReceived" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryTransferItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryTransferItem_quantitySent_check" CHECK ("quantitySent" > 0),
  CONSTRAINT "InventoryTransferItem_quantityReceived_check" CHECK ("quantityReceived" IS NULL OR "quantityReceived" >= 0)
);

CREATE INDEX "InventoryTransfer_groupId_status_idx" ON "InventoryTransfer"("groupId", "status");
CREATE INDEX "InventoryTransfer_originStoreId_dispatchedAt_idx" ON "InventoryTransfer"("originStoreId", "dispatchedAt");
CREATE INDEX "InventoryTransfer_destinationStoreId_status_dispatchedAt_idx" ON "InventoryTransfer"("destinationStoreId", "status", "dispatchedAt");
CREATE INDEX "InventoryTransfer_dispatchedByUserId_idx" ON "InventoryTransfer"("dispatchedByUserId");
CREATE INDEX "InventoryTransfer_receivedByUserId_idx" ON "InventoryTransfer"("receivedByUserId");
CREATE UNIQUE INDEX "InventoryTransferItem_transferId_productVariantId_inventoryLotId_key" ON "InventoryTransferItem"("transferId", "productVariantId", "inventoryLotId");
CREATE INDEX "InventoryTransferItem_productVariantId_idx" ON "InventoryTransferItem"("productVariantId");
CREATE INDEX "InventoryTransferItem_inventoryLotId_idx" ON "InventoryTransferItem"("inventoryLotId");

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "StoreGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_originStoreId_fkey"
FOREIGN KEY ("originStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_destinationStoreId_fkey"
FOREIGN KEY ("destinationStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_dispatchedByUserId_fkey"
FOREIGN KEY ("dispatchedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_receivedByUserId_fkey"
FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransferItem"
ADD CONSTRAINT "InventoryTransferItem_transferId_fkey"
FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryTransferItem"
ADD CONSTRAINT "InventoryTransferItem_productVariantId_fkey"
FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryTransferItem"
ADD CONSTRAINT "InventoryTransferItem_inventoryLotId_fkey"
FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
