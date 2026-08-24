CREATE TYPE "KitchenTicketAdjustmentStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED');

CREATE TABLE "KitchenTicketAdjustment" (
    "id" SERIAL NOT NULL,
    "kitchenTicketId" INTEGER NOT NULL,
    "kitchenTicketItemId" INTEGER NOT NULL,
    "accountItemId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "status" "KitchenTicketAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    CONSTRAINT "KitchenTicketAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KitchenTicketAdjustment_kitchenTicketId_status_idx" ON "KitchenTicketAdjustment"("kitchenTicketId", "status");
CREATE INDEX "KitchenTicketAdjustment_accountItemId_idx" ON "KitchenTicketAdjustment"("accountItemId");

ALTER TABLE "KitchenTicketAdjustment" ADD CONSTRAINT "KitchenTicketAdjustment_kitchenTicketId_fkey" FOREIGN KEY ("kitchenTicketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketAdjustment" ADD CONSTRAINT "KitchenTicketAdjustment_kitchenTicketItemId_fkey" FOREIGN KEY ("kitchenTicketItemId") REFERENCES "KitchenTicketItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
