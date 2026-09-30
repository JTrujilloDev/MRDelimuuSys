import { prisma } from "../../lib/prisma";
import { requirePositiveId } from "./organization.validation";

const requireSalePrice = (value: unknown) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) throw new Error("Valid sale price is required");
  return price;
};

export const getGroupCatalogService = async (groupIdValue: unknown) => {
  const groupId = requirePositiveId(groupIdValue, "groupId");
  const group = await prisma.storeGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Store group not found");

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
      variants: product.variants.map(({ catalogItems, ...variant }) => ({
        ...variant,
        catalog: catalogItems[0] ?? null,
      })),
    })),
  };
};

export const updateGroupCatalogItemService = async (
  groupIdValue: unknown,
  variantIdValue: unknown,
  data: { salePrice?: unknown; isActive?: unknown },
) => {
  const groupId = requirePositiveId(groupIdValue, "groupId");
  const productVariantId = requirePositiveId(variantIdValue, "productVariantId");
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }
  const isActive = data.isActive as boolean | undefined;

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
  if (!["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"].includes(variant.product.productType)) {
    throw new Error("Only saleable products can be added to a commercial catalog");
  }

  const current = await prisma.groupCatalogItem.findUnique({
    where: { groupId_productVariantId: { groupId, productVariantId } },
  });
  const salePrice = data.salePrice === undefined
    ? current?.salePrice ?? variant.retailPrice
    : requireSalePrice(data.salePrice);

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
        isActive: isActive ?? true,
      },
      update: {
        salePrice,
        isActive,
      },
      include: { productVariant: { include: { product: true } } },
    });
  });
};
