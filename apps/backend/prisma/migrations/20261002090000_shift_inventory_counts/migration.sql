CREATE TABLE "ShiftInventoryCount" (
  "id" SERIAL PRIMARY KEY,
  "cashRegisterId" INTEGER NOT NULL REFERENCES "CashRegister"("id") ON DELETE RESTRICT,
  "phase" TEXT NOT NULL CHECK ("phase" IN ('OPENING', 'CLOSING')),
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" INTEGER REFERENCES "User"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedVerifications" JSONB NOT NULL DEFAULT '[]',
  UNIQUE ("cashRegisterId", "phase")
);
CREATE TABLE "ShiftInventoryCountItem" (
  "id" SERIAL PRIMARY KEY,
  "countId" INTEGER NOT NULL REFERENCES "ShiftInventoryCount"("id") ON DELETE RESTRICT,
  "productVariantId" INTEGER NOT NULL REFERENCES "ProductVariant"("id") ON DELETE RESTRICT,
  "productName" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "expectedQuantity" INTEGER NOT NULL,
  "countedQuantity" INTEGER NOT NULL CHECK ("countedQuantity" >= 0),
  "movementRevision" INTEGER NOT NULL,
  "difference" INTEGER NOT NULL,
  "justification" TEXT,
  "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "countedByUserId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "resolution" TEXT CHECK ("resolution" IN ('ADJUSTMENT', 'EXPLAINED', 'COUNT_ERROR')),
  "resolutionReason" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" INTEGER REFERENCES "User"("id") ON DELETE RESTRICT,
  "adjustmentOperationId" TEXT UNIQUE,
  UNIQUE ("countId", "productVariantId")
);
CREATE INDEX "ShiftInventoryCountItem_resolution_difference_idx" ON "ShiftInventoryCountItem"("resolution", "difference");
