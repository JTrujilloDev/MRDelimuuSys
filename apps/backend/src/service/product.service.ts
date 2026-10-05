import {
  ProductType,
  Unit,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { requirePosCode } from "./catalog.rules";
import { isRecipeComponentType, requireRecipeQuantity } from "./productRecipe.rules";

interface RecipeItem {
  ingredientVariantId: number;
  quantity: number;
}
interface ProductVariantDTO {
  name: string;
  isActive: boolean;
  requirePreparation: boolean;
  productCost: number;
  unit: Unit;
  recipeItems?: RecipeItem[];
}
interface CreateProductData {
  name: string;
  description?: string;
  categoryId: number;
  productType: ProductType;
  variants: ProductVariantDTO[];
}

const validateRecipeComponents = async (variants: ProductVariantDTO[]) => {
  const recipeItems = variants.flatMap((variant) => variant.recipeItems ?? []);
  if (recipeItems.length === 0) return;
  recipeItems.forEach((item) => requireRecipeQuantity(item.quantity));
  const componentIds = [...new Set(recipeItems.map((item) => Number(item.ingredientVariantId)))];
  const components = await prisma.productVariant.findMany({
    where: { id: { in: componentIds }, isActive: true },
    select: { id: true, product: { select: { productType: true } } },
  });
  if (components.length !== componentIds.length) throw new Error("One or more recipe components are invalid");
  if (components.some((component) => !isRecipeComponentType(component.product.productType))) {
    throw new Error("Recipes only accept ingredients, prepared bases, and packaging");
  }
};

export const createProductService = async (productData: CreateProductData) => {
  console.log(productData);

  if (!productData.name || !productData.categoryId) {
    throw new Error("Name and categoryId are required");
  }

  if (!productData.productType) {
    throw new Error("Product type is required");
  }

  if (
    !Array.isArray(productData.variants) ||
    productData.variants.length === 0
  ) {
    throw new Error("Variants must be a non-empty array");
  }

  for (const variant of productData.variants) {
    if (!variant.name) {
      throw new Error("Each variant must have a name");
    }
  }
  if (productData.productType === ProductType.RECIPE_PRODUCT) {
    await validateRecipeComponents(productData.variants);
  }

  const existingProduct = await prisma.product.findFirst({
    where: {
      name: productData.name,
    },
  });

  if (existingProduct) {
    throw new Error(`Product with name "${productData.name}" already exists`);
  }

  const newProduct = await prisma.product.create({
    data: {
      name: productData.name,
      description: productData.description,
      categoryId: productData.categoryId,
      productType: productData.productType,

      variants: {
        create: productData.variants.map((variant) => ({
          name: variant.name,
          productCost: variant.productCost,
          isActive: variant.isActive ?? true,
          requirePreparation: variant.requirePreparation ?? false,
          preparationArea: "KITCHEN",
          unit: variant.unit,
          recipeItems: {
            create:
              variant.recipeItems?.map((item) => ({
                ingredientVariantId: item.ingredientVariantId,
                quantity: item.quantity,
              })) ?? [],
          },
        })),
      },
    },

    include: {
      category: true,
      variants: {
        ...(productData.productType === "RECIPE_PRODUCT" && {
          include: {
            recipeItems: true,
          },
        }),
      },
    },
  });

  return newProduct;
};

export const getAllProductsService = async (includeCost = false) => {
  const products = await prisma.product.findMany({
    include: { variants: { include: { recipeItems: true } }, category: true },
  });
  return products.map((product) => ({
    ...product,
    variants: product.variants.map(({ productCost, ...variant }) => ({
      ...variant,
      ...(includeCost && { productCost }),
    })),
  }));
};

export const getAllActiveProductsService = async (storeId: number) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("Store not found");
  const activeProducts = await prisma.product.findMany({
    where: {
      variants: {
        some: {
          isActive: true,
        },
      },
    },
    include: {
      variants: {
        where: {
          isActive: true,
        },
        include: {
          catalogItems: { where: { groupId: store.groupId, isPosActive: true } },
          storeInventories: { where: { storeId } },
        },
      },
      category: true, // opcional si también necesitas categoría
    },
  });
  return activeProducts.map((product) => ({
    ...product,
    variants: product.variants.map(({ catalogItems, storeInventories, productCost: _productCost, ...variant }) => ({
      ...variant,
      retailPrice: catalogItems[0]?.salePrice ?? 0,
      stock: storeInventories[0]?.stock ?? 0,
      minStock: storeInventories[0]?.minStock ?? 0,
      isNew: !(storeInventories[0]?.isInitialized ?? false),
      isInCatalog: Boolean(catalogItems[0]),
    })),
  }));
};

export const getInventoryProductsService = async (storeId: number) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { groupId: true },
  });
  if (!store) throw new Error("Store not found");

  const products = await prisma.product.findMany({
    where: {
      variants: {
        some: {
          isActive: true,
          catalogItems: { some: { groupId: store.groupId } },
        },
      },
    },
    include: {
      category: true,
      variants: {
        where: {
          isActive: true,
          catalogItems: { some: { groupId: store.groupId } },
        },
        include: {
          catalogItems: { where: { groupId: store.groupId } },
          storeInventories: { where: { storeId } },
          inventoryLots: {
            where: { storeInventories: { some: { storeId, stock: { gt: 0 } } } },
            include: { storeInventories: { where: { storeId, stock: { gt: 0 } } } },
            orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return products.map((product) => ({
    ...product,
    variants: product.variants.map(({
      catalogItems,
      storeInventories,
      inventoryLots,
      productCost: _productCost,
      ...variant
    }) => ({
      ...variant,
      stock: storeInventories[0]?.stock ?? 0,
      minStock: storeInventories[0]?.minStock ?? 0,
      isNew: !(storeInventories[0]?.isInitialized ?? false),
      isCatalogActive: catalogItems[0]?.isPosActive ?? false,
      lots: inventoryLots.map(({ storeInventories: lotInventories, ...lot }) => ({
        ...lot,
        stock: lotInventories[0]?.stock ?? 0,
      })),
    })),
  }));
};

export const getProductByIdService = async (id: number, includeCost = false) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!product) return null;
  return {
    ...product,
    variants: product.variants.map(({ productCost, ...variant }) => ({
      ...variant,
      ...(includeCost && { productCost }),
    })),
  };
};

export const deleteProductService = async (id: number) => {
  const deletedProduct = await prisma.product.delete({
    where: { id },
  });
  return deletedProduct;
};

export const updateProductService = async (id: number, productData: any) => {
  const currentProduct = await prisma.product.findUnique({
    where: { id },
    select: { productType: true },
  });

  if (!currentProduct) {
    throw new Error("Product not found");
  }

  const variants = productData.variants || [];
  const nextProductType = productData.productType ?? currentProduct.productType;
  if (nextProductType === ProductType.RECIPE_PRODUCT) {
    await validateRecipeComponents(variants);
  }
  const variantsToCreate = variants.filter((v: any) => !v.id);
  const variantsToUpdate = variants.filter((v: any) => v.id);
  await prisma.product.update({
    where: { id },
    data: {
      ...(productData.name !== undefined && {
        name: productData.name,
      }),
      ...(productData.description !== undefined && {
        description: productData.description,
      }),
      ...(productData.categoryId !== undefined && {
        categoryId: productData.categoryId,
      }),
      ...(productData.productType !== undefined && {
        productType: productData.productType,
      }),

      ...(variants.length > 0 && {
        variants: {
          create: variantsToCreate.map((v: any) => ({
            name: v.name,
            productCost: v.productCost,
            isActive: v.isActive ?? true,
            requirePreparation: v.requirePreparation ?? false,
            unit: v.unit,

            recipeItems: {
              create:
                v.recipeItems?.map((item: any) => ({
                  ingredientVariantId: item.ingredientVariantId,
                  quantity: item.quantity,
                })) ?? [],
            },
          })),

          update: variantsToUpdate.map((v: any) => ({
            where: { id: v.id },
            data: {
              ...(v.name !== undefined && { name: v.name }),
              ...(v.productCost !== undefined && {
                productCost: v.productCost,
              }),
              ...(v.isActive !== undefined && {
                isActive: v.isActive,
              }),
              ...(v.requirePreparation !== undefined && {
                requirePreparation: v.requirePreparation,
              }),
              ...(v.unit !== undefined && {
                unit: v.unit,
              }),

              recipeItems: {
                deleteMany: {},

                create:
                  v.recipeItems?.map((item: any) => ({
                    ingredientVariantId: item.ingredientVariantId,
                    quantity: item.quantity,
                  })) ?? [],
              },
            },
          })),
        },
      }),
    },

    include: {
      category: true,
      variants: {
        include: {
          recipeItems: true,
        },
      },
    },
  });
};

export const getProductsByCategoryService = async (categoryId: number, storeId: number) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("Store not found");
  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      variants: {
        some: {
          isActive: true,
          catalogItems: { some: { groupId: store.groupId, isPosActive: true } },
        },
      },
    },
    include: {
      variants: {
        where: {
          isActive: true,
          catalogItems: { some: { groupId: store.groupId, isPosActive: true } },
        },
        include: {
          catalogItems: { where: { groupId: store.groupId, isPosActive: true } },
          storeInventories: { where: { storeId } },
          inventoryLots: {
            where: {
              expiresAt: { lt: todayStart },
              storeInventories: { some: { storeId, stock: { gt: 0 } } },
            },
            include: { storeInventories: { where: { storeId, stock: { gt: 0 } } } },
          },
          recipeItems: {
            include: {
              ingredientVariant: {
                include: {
                  product: true,
                  storeInventories: { where: { storeId } },
                },
              },
            },
          },
        }, 
      },
    },
  });
  return products.map((product) => ({
    ...product,
    variants: product.variants.map(({ catalogItems, storeInventories, inventoryLots, productCost: _productCost, ...variant }) => ({
      ...variant,
      retailPrice: catalogItems[0]!.salePrice,
      posCode: catalogItems[0]!.posCode,
      stock: storeInventories[0]?.stock ?? 0,
      minStock: storeInventories[0]?.minStock ?? 0,
      isNew: !(storeInventories[0]?.isInitialized ?? false),
      expiredStock: inventoryLots.reduce(
        (total, lot) => total + lot.storeInventories.reduce((sum, inventory) => sum + inventory.stock, 0),
        0,
      ),
      recipeItems: variant.recipeItems.map((recipeItem) => ({
        ...recipeItem,
        ingredientVariant: {
          ...Object.fromEntries(
            Object.entries(recipeItem.ingredientVariant).filter(([key]) => key !== "productCost"),
          ),
          stock: recipeItem.ingredientVariant.storeInventories[0]?.stock ?? 0,
          storeInventories: undefined,
        },
      })),
    })),
  }));
};

export const getPosProductsService = async (storeId: number) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("Store not found");
  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const products = await prisma.product.findMany({
    where: {
      variants: {
        some: {
          isActive: true,
          catalogItems: { some: { groupId: store.groupId, isPosActive: true } },
        },
      },
    },
    include: {
      category: true,
      variants: {
        where: {
          isActive: true,
          catalogItems: { some: { groupId: store.groupId, isPosActive: true } },
        },
        include: {
          catalogItems: { where: { groupId: store.groupId, isPosActive: true } },
          storeInventories: { where: { storeId } },
          inventoryLots: {
            where: {
              expiresAt: { lt: todayStart },
              storeInventories: { some: { storeId, stock: { gt: 0 } } },
            },
            include: { storeInventories: { where: { storeId, stock: { gt: 0 } } } },
          },
          recipeItems: {
            include: {
              ingredientVariant: {
                include: {
                  product: true,
                  storeInventories: { where: { storeId } },
                },
              },
            },
          },
        },
      },
    },
  });

  return products.map((product) => ({
    ...product,
    variants: product.variants.map(({ catalogItems, storeInventories, inventoryLots, productCost: _productCost, ...variant }) => ({
      ...variant,
      retailPrice: catalogItems[0]!.salePrice,
      posCode: catalogItems[0]!.posCode,
      stock: storeInventories[0]?.stock ?? 0,
      minStock: storeInventories[0]?.minStock ?? 0,
      isNew: !(storeInventories[0]?.isInitialized ?? false),
      expiredStock: inventoryLots.reduce(
        (total, lot) => total + lot.storeInventories.reduce((sum, inventory) => sum + inventory.stock, 0),
        0,
      ),
      recipeItems: variant.recipeItems.map((recipeItem) => ({
        ...recipeItem,
        ingredientVariant: {
          ...Object.fromEntries(
            Object.entries(recipeItem.ingredientVariant).filter(([key]) => key !== "productCost"),
          ),
          stock: recipeItem.ingredientVariant.storeInventories[0]?.stock ?? 0,
          storeInventories: undefined,
        },
      })),
    })),
  }));
};

export const getProductByPosCodeService = async (code: unknown, storeId: number) => {
  const posCode = requirePosCode(code);
  if (!posCode) throw new Error("Ingresa un código de producto");

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      groupId: true,
      name: true,
      group: { select: { name: true } },
    },
  });
  if (!store) throw new Error("Store not found");

  const catalogItem = await prisma.groupCatalogItem.findUnique({
    where: { groupId_posCode: { groupId: store.groupId, posCode } },
    include: {
      productVariant: {
        include: {
          product: { include: { category: true } },
          storeInventories: { where: { storeId } },
          recipeItems: {
            include: {
              ingredientVariant: {
                include: {
                  product: true,
                  storeInventories: { where: { storeId } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!catalogItem) {
    const catalogInAnotherGroup = await prisma.groupCatalogItem.findFirst({
      where: { posCode },
      select: { group: { select: { name: true } } },
    });
    if (catalogInAnotherGroup) {
      throw new Error(
        `El código ${posCode} pertenece al catálogo ${catalogInAnotherGroup.group.name}, ` +
        `pero ${store.name} usa el catálogo ${store.group.name}. Asígnalo también a ${store.group.name}.`,
      );
    }
    throw new Error(`El código ${posCode} no existe en el catálogo ${store.group.name}`);
  }

  if (!catalogItem.isPosActive || catalogItem.salePrice === null || !catalogItem.productVariant.isActive) {
    throw new Error(
      `El código ${posCode} existe en ${store.group.name}, pero el producto no está activo para vender en el POS`,
    );
  }

  const { productVariant: variant } = catalogItem;
  const { product, storeInventories, recipeItems, productCost: _productCost, ...variantData } = variant;
  return {
    ...product,
    variants: [{
      ...variantData,
      retailPrice: catalogItem.salePrice,
      posCode: catalogItem.posCode,
      stock: storeInventories[0]?.stock ?? 0,
      minStock: storeInventories[0]?.minStock ?? 0,
      isNew: !(storeInventories[0]?.isInitialized ?? false),
      recipeItems: recipeItems.map((recipeItem) => ({
        ...recipeItem,
        ingredientVariant: {
          ...Object.fromEntries(
            Object.entries(recipeItem.ingredientVariant).filter(([key]) => key !== "productCost"),
          ),
          stock: recipeItem.ingredientVariant.storeInventories[0]?.stock ?? 0,
          storeInventories: undefined,
        },
      })),
    }],
  };
};



