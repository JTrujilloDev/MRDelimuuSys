-- CreateEnum
CREATE TYPE "BillingEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ElectronicDocumentStatus" AS ENUM ('PENDING', 'SENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'REQUIRES_RECONCILIATION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REQUIRES_RECONCILIATION');

-- CreateEnum
CREATE TYPE "BillingAttemptOutcome" AS ENUM ('PROCESSING', 'ACCEPTED', 'REJECTED', 'TRANSIENT_ERROR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BillingArtifactType" AS ENUM ('PDF', 'XML', 'ATTACHED_DOCUMENT_XML');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "fiscalIssuerId" INTEGER;

-- CreateTable
CREATE TABLE "FiscalIssuer" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "nit" TEXT NOT NULL,
    "verificationDigit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalIssuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProviderConfiguration" (
    "id" SERIAL NOT NULL,
    "issuerId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" "BillingEnvironment" NOT NULL,
    "credentialReference" TEXT NOT NULL,
    "configuration" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProviderConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalNumberingRange" (
    "id" SERIAL NOT NULL,
    "issuerId" INTEGER NOT NULL,
    "providerConfigurationId" INTEGER NOT NULL,
    "remoteId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "prefix" TEXT,
    "resolutionNumber" TEXT,
    "rangeFrom" INTEGER,
    "rangeTo" INTEGER,
    "validFrom" DATE,
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalNumberingRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operationKey" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "ElectronicDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "issuerId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "providerConfigurationId" INTEGER NOT NULL,
    "numberingRangeId" INTEGER,
    "originalDocumentId" UUID,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "providerDocumentId" TEXT,
    "providerNumber" TEXT,
    "fiscalIdentifier" TEXT,
    "providerStatus" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAttempt" (
    "id" SERIAL NOT NULL,
    "documentId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" "BillingAttemptOutcome" NOT NULL,
    "requestFingerprint" TEXT,
    "httpStatus" INTEGER,
    "providerCode" TEXT,
    "providerMessage" TEXT,
    "diagnostics" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "BillingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingJob" (
    "id" SERIAL NOT NULL,
    "documentId" UUID NOT NULL,
    "status" "BillingJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingArtifact" (
    "id" SERIAL NOT NULL,
    "documentId" UUID NOT NULL,
    "type" "BillingArtifactType" NOT NULL,
    "providerKey" TEXT,
    "contentHash" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalIssuer_code_key" ON "FiscalIssuer"("code");
CREATE UNIQUE INDEX "FiscalIssuer_nit_key" ON "FiscalIssuer"("nit");
CREATE INDEX "FiscalIssuer_isActive_idx" ON "FiscalIssuer"("isActive");
CREATE UNIQUE INDEX "BillingProviderConfiguration_issuerId_provider_environment_version_key" ON "BillingProviderConfiguration"("issuerId", "provider", "environment", "version");
CREATE INDEX "BillingProviderConfiguration_issuerId_environment_isActive_idx" ON "BillingProviderConfiguration"("issuerId", "environment", "isActive");
CREATE UNIQUE INDEX "FiscalNumberingRange_providerConfigurationId_remoteId_key" ON "FiscalNumberingRange"("providerConfigurationId", "remoteId");
CREATE INDEX "FiscalNumberingRange_issuerId_documentType_isActive_idx" ON "FiscalNumberingRange"("issuerId", "documentType", "isActive");
CREATE UNIQUE INDEX "ElectronicDocument_operationKey_key" ON "ElectronicDocument"("operationKey");
CREATE UNIQUE INDEX "ElectronicDocument_issuerId_referenceCode_key" ON "ElectronicDocument"("issuerId", "referenceCode");
CREATE INDEX "ElectronicDocument_storeId_createdAt_idx" ON "ElectronicDocument"("storeId", "createdAt");
CREATE INDEX "ElectronicDocument_accountId_idx" ON "ElectronicDocument"("accountId");
CREATE INDEX "ElectronicDocument_status_createdAt_idx" ON "ElectronicDocument"("status", "createdAt");
CREATE INDEX "ElectronicDocument_originalDocumentId_idx" ON "ElectronicDocument"("originalDocumentId");
CREATE UNIQUE INDEX "BillingAttempt_documentId_attemptNumber_key" ON "BillingAttempt"("documentId", "attemptNumber");
CREATE INDEX "BillingAttempt_documentId_startedAt_idx" ON "BillingAttempt"("documentId", "startedAt");
CREATE UNIQUE INDEX "BillingJob_documentId_key" ON "BillingJob"("documentId");
CREATE INDEX "BillingJob_status_nextAttemptAt_idx" ON "BillingJob"("status", "nextAttemptAt");
CREATE UNIQUE INDEX "BillingArtifact_documentId_type_key" ON "BillingArtifact"("documentId", "type");
CREATE INDEX "Store_fiscalIssuerId_idx" ON "Store"("fiscalIssuerId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_fiscalIssuerId_fkey" FOREIGN KEY ("fiscalIssuerId") REFERENCES "FiscalIssuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingProviderConfiguration" ADD CONSTRAINT "BillingProviderConfiguration_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "FiscalIssuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FiscalNumberingRange" ADD CONSTRAINT "FiscalNumberingRange_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "FiscalIssuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FiscalNumberingRange" ADD CONSTRAINT "FiscalNumberingRange_providerConfigurationId_fkey" FOREIGN KEY ("providerConfigurationId") REFERENCES "BillingProviderConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "FiscalIssuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_providerConfigurationId_fkey" FOREIGN KEY ("providerConfigurationId") REFERENCES "BillingProviderConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_numberingRangeId_fkey" FOREIGN KEY ("numberingRangeId") REFERENCES "FiscalNumberingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_originalDocumentId_fkey" FOREIGN KEY ("originalDocumentId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingAttempt" ADD CONSTRAINT "BillingAttempt_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingJob" ADD CONSTRAINT "BillingJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingArtifact" ADD CONSTRAINT "BillingArtifact_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
