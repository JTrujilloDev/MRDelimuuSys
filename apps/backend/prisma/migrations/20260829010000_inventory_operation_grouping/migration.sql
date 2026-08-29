ALTER TABLE "InventoryTransaction"
ADD COLUMN "operationId" TEXT;

CREATE INDEX "InventoryTransaction_operationId_idx"
ON "InventoryTransaction"("operationId");

CREATE INDEX "InventoryTransaction_createdAt_idx"
ON "InventoryTransaction"("createdAt");

CREATE INDEX "InventoryTransaction_type_idx"
ON "InventoryTransaction"("type");
