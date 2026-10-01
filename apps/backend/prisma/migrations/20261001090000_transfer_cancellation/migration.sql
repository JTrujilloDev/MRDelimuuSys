ALTER TYPE "InventoryTransferStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'TRANSFER_REVERSAL';

ALTER TABLE "InventoryTransfer"
ADD COLUMN "cancelledByUserId" INTEGER,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "InventoryTransfer_cancelledByUserId_idx"
ON "InventoryTransfer"("cancelledByUserId");

ALTER TABLE "InventoryTransfer"
ADD CONSTRAINT "InventoryTransfer_cancelledByUserId_fkey"
FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
