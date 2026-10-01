CREATE TYPE "InventoryLossReason" AS ENUM (
  'EXPIRATION',
  'DAMAGED',
  'PREPARATION_ERROR',
  'QUALITY_CONTROL',
  'OTHER'
);

ALTER TABLE "InventoryTransaction"
ADD COLUMN "lossReason" "InventoryLossReason";

CREATE INDEX "InventoryTransaction_lossReason_idx"
ON "InventoryTransaction"("lossReason");
