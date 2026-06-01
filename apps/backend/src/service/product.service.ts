import { Prisma, Product, ProductVariant } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

interface CreateProductData {
  name: string;
  description?: string;
  categoryId: number;
  variants: Omit<
    ProductVariant,
    "id" | "productId" | "createdAt" | "accountItems" | "InventoryTransactions"
  >[];
}

export const createProductService = async (productData: CreateProductData) => {
  if (!productData.name || !productData.categoryId) {
    throw new Error("Name and categoryId are required");
  }

  if (!Array.isArray(productData.variants)) {
    throw new Error("Variants must be an array");
  }

  for (const variant of productData.variants) {
    if (!variant.name || variant.retailPrice == null) {
      throw new Error("Each variant must have a name and price");
    }
  }

  const existingProduct = await prisma.product.findFirst({
    where: { name: productData.name },
  });

  if (existingProduct) {
    throw new Error(`Product with name "${productData.name}" already exists`);
  }

  console.log("Creating product with data:", productData);
  const newProduct = await prisma.product.create({
    data: {
      name: productData.name,
      description: productData.description,
      categoryId: productData.categoryId,
      variants: {
        create: productData.variants.map((variant: any) => ({
          name: variant.name,
          retailPrice: variant.retailPrice,
          wholesalePrice: variant.wholesalePrice,
          minStock: variant.minStock,
          productCost: variant.productCost,
          isActive: variant.isActive ?? true,
          requirePreparation: variant.requirePreparation ?? false,
        })),
      },
    },
    include: { variants: true, category: true },
  });

  return newProduct;
};

export const getAllProductsService = async () => {
  const products = await prisma.product.findMany({
    include: { variants: true, category: true },
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

  const updatedProduct = await prisma.product.update({
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

      ...(variants.length > 0 && {
        variants: {
          create: variantsToCreate.map((v: any) => ({
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
            ...(v.requiresPreparation !== undefined && {
              requirePreparation: v.requiresPreparation,
            }),
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
              ...(v.requiresPreparation !== undefined && {
                requirePreparation: v.requiresPreparation,
              }),
            },
          })),
        },
      }),
    },
    include: {
      variants: true,
    },
  });

  return updatedProduct;
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
      },
    },
  });

  return products;
};
