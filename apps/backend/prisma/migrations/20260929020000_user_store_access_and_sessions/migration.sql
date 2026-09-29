-- Extend users with global administration and login audit data.
ALTER TABLE "User"
ADD COLUMN "isGlobalAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "User"
SET "isGlobalAdmin" = true
WHERE "role" = 'ADMIN';

-- Store-scoped permissions.
CREATE TABLE "UserStoreAccess" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStoreAccess_pkey" PRIMARY KEY ("id")
);

-- Existing users keep access to the original Delimuu point.
INSERT INTO "UserStoreAccess" ("userId", "storeId", "role")
SELECT user_row."id", store_row."id", user_row."role"
FROM "User" user_row
CROSS JOIN "Store" store_row
WHERE store_row."code" = 'DELIMUU_MAIN';

-- Opaque, revocable browser sessions. Only a hash of the cookie token is stored.
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "activeStoreId" INTEGER,
    "activeTerminalId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserStoreAccess_userId_storeId_key" ON "UserStoreAccess"("userId", "storeId");
CREATE INDEX "UserStoreAccess_storeId_role_isActive_idx" ON "UserStoreAccess"("storeId", "role", "isActive");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");
CREATE INDEX "UserSession_activeStoreId_idx" ON "UserSession"("activeStoreId");
CREATE INDEX "UserSession_activeTerminalId_idx" ON "UserSession"("activeTerminalId");

ALTER TABLE "UserStoreAccess"
ADD CONSTRAINT "UserStoreAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserStoreAccess"
ADD CONSTRAINT "UserStoreAccess_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserSession"
ADD CONSTRAINT "UserSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSession"
ADD CONSTRAINT "UserSession_activeStoreId_fkey"
FOREIGN KEY ("activeStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserSession"
ADD CONSTRAINT "UserSession_activeTerminalId_fkey"
FOREIGN KEY ("activeTerminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
