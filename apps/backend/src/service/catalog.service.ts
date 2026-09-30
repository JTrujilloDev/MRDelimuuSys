import { prisma } from "../../lib/prisma";
import { requirePositiveId } from "./organization.validation";
import { requireCatalogPrice } from "./catalog.rules";

export const getGroupCatalogService = async (
  groupIdValue: unknown,
  access: { isGlobalAdmin: boolean; activeStoreId?: number | null; storeRole?: string | null },
) => {
  const groupId = requirePositiveId(groupIdValue, "groupId");
  const group = await prisma.storeGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Store group not found");
  if (!access.isGlobalAdmin) {
    if (access.storeRole !== "ADMIN" || !access.activeStoreId) {
      throw new Error("Catalog manager access required");
    }
    const activeStore = await prisma.store.findUnique({
      where: { id: access.activeStoreId },
      select: { groupId: true },
    });
    if (activeStore?.groupId !== groupId) throw new Error("Catalog belongs to another group");
  }

  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: {
        orderBy: { name: "asc" },
        include: { catalogItems: { where: { groupId } } },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return {
    group,
    products: products.map((product) => ({
      ...product,
      variants: product.variants.map(({ catalogItems, productCost, ...variant }) => ({
        ...variant,
        ...(access.isGlobalAdmin && { productCost }),
        catalog: catalogItems[0]
          ? {
              ...catalogItems[0],
              ...(!access.isGlobalAdmin && { costPrice: undefined }),
            }
          : null,
      })),
    })),
  };
};

export const updateGroupCatalogItemService = async (
  groupIdValue: unknown,
  variantIdValue: unknown,
  data: { salePrice?: unknown; costPrice?: unknown; isPosActive?: unknown },
) => {
  const groupId = requirePositiveId(groupIdValue, "groupId");
  const productVariantId = requirePositiveId(variantIdValue, "productVariantId");
  if (data.isPosActive !== undefined && typeof data.isPosActive !== "boolean") {
    throw new Error("isPosActive must be a boolean");
  }
  const isPosActive = data.isPosActive as boolean | undefined;

  const [group, variant] = await Promise.all([
    prisma.storeGroup.findUnique({ where: { id: groupId }, include: { stores: true } }),
    prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: { select: { productType: true } } },
    }),
  ]);
  if (!group) throw new Error("Store group not found");
  if (!variant) throw new Error("Product variant not found");
  if (!group.isActive) throw new Error("Store group is inactive");
  if (!variant.isActive) throw new Error("Product variant is inactive");
  const isSaleable = ["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"]
    .includes(variant.product.productType);
  if (!isSaleable && isPosActive) throw new Error("Operational products cannot be enabled in the POS");

  const current = await prisma.groupCatalogItem.findUnique({
    where: { groupId_productVariantId: { groupId, productVariantId } },
  });
  if (isSaleable && data.salePrice === undefined && !current) throw new Error("Sale price is required");
  if (data.costPrice === undefined && !current) throw new Error("Group cost is required");
  const salePrice = isSaleable
    ? data.salePrice === undefined
      ? current!.salePrice
      : requireCatalogPrice(data.salePrice, "sale price")
    : null;
  const costPrice = data.costPrice === undefined
    ? current!.costPrice
    : requireCatalogPrice(data.costPrice, "group cost");

  return prisma.$transaction(async (tx) => {
    await tx.storeInventory.createMany({
      data: group.stores.map((store) => ({ storeId: store.id, productVariantId })),
      skipDuplicates: true,
    });

    return tx.groupCatalogItem.upsert({
      where: { groupId_productVariantId: { groupId, productVariantId } },
      create: {
        groupId,
        productVariantId,
        salePrice,
        costPrice,
        isPosActive: isSaleable ? isPosActive ?? true : false,
      },
      update: {
        salePrice,
        costPrice,
        isPosActive: isSaleable ? isPosActive : false,
      },
      include: { productVariant: { include: { product: true } } },
    });
  });
};

export const deleteGroupCatalogItemService = async (
  groupIdValue: unknown,
  variantIdValue: unknown,
) => {
  const groupId = requirePositiveId(groupIdValue, "groupId");
  const productVariantId = requirePositiveId(variantIdValue, "productVariantId");
  const current = await prisma.groupCatalogItem.findUnique({
    where: { groupId_productVariantId: { groupId, productVariantId } },
  });
  if (!current) throw new Error("Product is not part of this catalog");

  const inventoryWithStock = await prisma.storeInventory.findFirst({
    where: { productVariantId, store: { groupId }, stock: { not: 0 } },
    include: { store: { select: { name: true } } },
  });
  if (inventoryWithStock) {
    throw new Error(`Cannot remove a product with inventory in ${inventoryWithStock.store.name}`);
  }

  return prisma.groupCatalogItem.delete({
    where: { groupId_productVariantId: { groupId, productVariantId } },
  });
};
