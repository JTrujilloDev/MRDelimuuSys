import { prisma } from "../../lib/prisma";

interface CreateCategoryDTO {
  name: string;
  description?: string;
  posVisible: boolean;
}

export const createCategoryService = async (data: CreateCategoryDTO) => {
  if (!data.name) {
    throw new Error("Name and description are required");
  }

  const existingCategory = await prisma.category.findFirst({
    where: { name: data.name },
  });

  if (existingCategory) {
    throw new Error(`Category with name "${data.name}" already exists`);
  }

  const newCategory = await prisma.category.create({
    data: {
      name: data.name,
      description: data.description,
      posVisible: data.posVisible,
    },
  });

  return newCategory;
};

export const getAllCategoriesService = async (storeId?: number) => {
  const store = storeId
    ? await prisma.store.findUnique({ where: { id: storeId }, select: { groupId: true } })
    : null;
  const categories = await prisma.category.findMany({
    where: store ? {
      posVisible: true,
      products: {
        some: {
          variants: {
            some: { catalogItems: { some: { groupId: store.groupId, isActive: true } } },
          },
        },
      },
    } : undefined,
  });
  return categories;
};

export const deleteCategoryService = async (id: number) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verificar si existe la categoría
    const category = await tx.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // 2. Verificar si tiene productos asociados
    const productsCount = await tx.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new Error("Cannot delete category with associated products");
    }

    // 3. Eliminar categoría
    const deletedCategory = await tx.category.delete({
      where: { id },
    });

    return deletedCategory;
  });
};

export const updateCategoryService = async (
  id: number,
  data: CreateCategoryDTO,
) => {
  const updatedCategory = await prisma.category.update({
    where: { id },
    data,
  });
  return updatedCategory;
};


