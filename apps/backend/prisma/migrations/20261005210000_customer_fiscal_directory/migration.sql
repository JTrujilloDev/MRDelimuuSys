ALTER TABLE "Account"
ADD COLUMN "customerSnapshot" JSONB;

ALTER TABLE "Customer"
ADD COLUMN "identificationType" TEXT,
ADD COLUMN "identification" TEXT,
ADD COLUMN "verificationDigit" TEXT,
ADD COLUMN "organizationType" TEXT,
ADD COLUMN "tradeName" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "municipalityCode" TEXT,
ADD COLUMN "tributeCode" TEXT,
ADD COLUMN "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Customer_identificationType_identification_key"
ON "Customer"("identificationType", "identification");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");
