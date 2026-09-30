-- Group catalogs and store inventories are now the only sources of sale price and stock.
ALTER TABLE "ProductVariant"
DROP COLUMN "retailPrice",
DROP COLUMN "wholesalePrice",
DROP COLUMN "stock",
DROP COLUMN "minStock",
DROP COLUMN "isNew";
