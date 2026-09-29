-- CreateEnum
CREATE TYPE "KitchenMode" AS ENUM ('NONE', 'TICKETS');

-- CreateTable
CREATE TABLE "StoreGroup" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreGroup_pkey" PRIMARY KEY ("id")
);

-- Seed the two commercial operations. Inventory will remain separated by Store.
INSERT INTO "StoreGroup" ("code", "name")
VALUES ('DELIMUU', 'Delimuu'), ('VELENO', 'Veleño');

-- Extend Store without losing existing points.
ALTER TABLE "Store"
ADD COLUMN "groupId" INTEGER,
ADD COLUMN "code" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "kitchenMode" "KitchenMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Store"
SET
    "groupId" = (SELECT "id" FROM "StoreGroup" WHERE "code" = 'DELIMUU'),
    "code" = CASE
        WHEN "id" = (SELECT MIN("id") FROM "Store") THEN 'DELIMUU_MAIN'
        ELSE 'LEGACY_STORE_' || "id"::TEXT
    END,
    "kitchenMode" = 'TICKETS';

INSERT INTO "Store" ("groupId", "code", "name", "isActive", "kitchenMode", "createdAt", "updatedAt")
SELECT "id", 'DELIMUU_MAIN', 'Delimuu principal', true, 'TICKETS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StoreGroup"
WHERE "code" = 'DELIMUU'
  AND NOT EXISTS (SELECT 1 FROM "Store" WHERE "code" = 'DELIMUU_MAIN');

INSERT INTO "Store" ("groupId", "code", "name", "isActive", "kitchenMode", "createdAt", "updatedAt")
SELECT "id", 'VELENO_POINT_1', 'Veleño 1', true, 'NONE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StoreGroup"
WHERE "code" = 'VELENO';

INSERT INTO "Store" ("groupId", "code", "name", "isActive", "kitchenMode", "createdAt", "updatedAt")
SELECT "id", 'VELENO_POINT_2', 'Veleño 2', true, 'NONE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StoreGroup"
WHERE "code" = 'VELENO';

ALTER TABLE "Store"
ALTER COLUMN "groupId" SET NOT NULL,
ALTER COLUMN "code" SET NOT NULL;

-- Extend Terminal and preserve all existing terminals.
ALTER TABLE "Terminal"
ADD COLUMN "code" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Terminal"
SET "code" = 'LEGACY_TERMINAL_' || "id"::TEXT;

INSERT INTO "Terminal" ("storeId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT "id", 'POS_1', 'Caja 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Store" store_row
WHERE store_row."code" = 'DELIMUU_MAIN'
  AND NOT EXISTS (SELECT 1 FROM "Terminal" terminal_row WHERE terminal_row."storeId" = store_row."id");

INSERT INTO "Terminal" ("storeId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT "id", 'POS_1', 'Caja 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Store" store_row
WHERE store_row."code" IN ('VELENO_POINT_1', 'VELENO_POINT_2');

ALTER TABLE "Terminal"
ALTER COLUMN "code" SET NOT NULL;

-- Replace destructive terminal deletion with historical-data protection.
ALTER TABLE "CashRegister" DROP CONSTRAINT "CashRegister_terminalId_fkey";
ALTER TABLE "CashRegister"
ADD CONSTRAINT "CashRegister_terminalId_fkey"
FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes and relations
CREATE UNIQUE INDEX "StoreGroup_code_key" ON "StoreGroup"("code");
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");
CREATE INDEX "Store_groupId_isActive_idx" ON "Store"("groupId", "isActive");
CREATE UNIQUE INDEX "Terminal_storeId_code_key" ON "Terminal"("storeId", "code");
CREATE INDEX "Terminal_storeId_isActive_idx" ON "Terminal"("storeId", "isActive");

ALTER TABLE "Store"
ADD CONSTRAINT "Store_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "StoreGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Terminal" DROP CONSTRAINT "Terminal_storeId_fkey";
ALTER TABLE "Terminal"
ADD CONSTRAINT "Terminal_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
