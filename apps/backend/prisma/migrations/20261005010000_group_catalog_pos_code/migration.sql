ALTER TABLE "GroupCatalogItem" ADD COLUMN "posCode" TEXT;

CREATE UNIQUE INDEX "GroupCatalogItem_groupId_posCode_key"
ON "GroupCatalogItem"("groupId", "posCode");
