import {
  ProductType,
  ProductVariant,
  Unit,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

interface RecipeItem {
  ingredientVariantId: number;
  quantity: number;
}
interface ProductVariantDTO {
  name: string;
  retailPrice: number;
  wholesalePrice: number | null;
  stock: number;
  minStock: number;
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
    if (!variant.name || variant.retailPrice == null) {
      throw new Error("Each variant must have a name and retail price");
    }
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
          retailPrice: variant.retailPrice,
          wholesalePrice: variant.wholesalePrice,
          minStock: variant.minStock,
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

export const getAllProductsService = async () => {
  const products = await prisma.product.findMany({
    include: { variants: { include: { recipeItems: true } }, category: true },
  });
  return products;
};

export const getAllActiveProductsService = async () => {
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
      },
      category: true, // opcional si también necesitas categoría
    },
  });
  return activeProducts;
};

export const getProductByIdService = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  return product;
};

export const deleteProductService = async (id: number) => {
  const deletedProduct = await prisma.product.delete({
    where: { id },
  });
  return deletedProduct;
};

export const updateProductService = async (id: number, productData: any) => {
  const variants = productData.variants || [];
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
            retailPrice: v.retailPrice,
            wholesalePrice: v.wholesalePrice,
            minStock: v.minStock,
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
              ...(v.retailPrice !== undefined && {
                retailPrice: v.retailPrice,
              }),
              ...(v.wholesalePrice !== undefined && {
                wholesalePrice: v.wholesalePrice,
              }),
              ...(v.minStock !== undefined && {
                minStock: v.minStock,
              }),
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

export const getProductsByCategoryService = async (categoryId: number) => {
  const products = await prisma.product.findMany({
    where: {
      categoryId,
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
          recipeItems: {
            include: {
              ingredientVariant: {
                include: {
                  product: true,
                },
              },
            },
          },
        }, 
      },
    },
  });

  return products;
};



