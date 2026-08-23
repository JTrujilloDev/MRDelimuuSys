CREATE TYPE "KitchenTicketStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED');

CREATE TABLE "KitchenTicket" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "status" "KitchenTicketStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenTicketItem" (
    "id" SERIAL NOT NULL,
    "kitchenTicketId" INTEGER NOT NULL,
    "accountItemId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "KitchenTicketItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KitchenTicket_accountId_status_idx" ON "KitchenTicket"("accountId", "status");
CREATE INDEX "KitchenTicketItem_kitchenTicketId_idx" ON "KitchenTicketItem"("kitchenTicketId");

ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_kitchenTicketId_fkey" FOREIGN KEY ("kitchenTicketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_accountItemId_fkey" FOREIGN KEY ("accountItemId") REFERENCES "AccountItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
