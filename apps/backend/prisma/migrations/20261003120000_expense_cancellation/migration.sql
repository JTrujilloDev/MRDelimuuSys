ALTER TABLE "FinancialTransaction"
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidedByUserId" INTEGER,
  ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "FinancialTransaction_requestKey_key" ON "FinancialTransaction"("requestKey");
