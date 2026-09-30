ALTER TABLE "Account"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledByUserId" INTEGER;

CREATE INDEX "Account_cancelledByUserId_idx"
ON "Account"("cancelledByUserId");

ALTER TABLE "Account"
ADD CONSTRAINT "Account_cancelledByUserId_fkey"
FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
