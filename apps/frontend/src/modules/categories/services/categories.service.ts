import { api } from "../../../shared/services/api";

export const getAllProductCategories = async () => {
  const { data } = await api.get("/product-categories");
  return data;
};

export const createProductCategory = async (category: { name: string; description: string }) => {
  const { data } = await api.post("/product-categories", category);
  return data;
};

export const updateProductCategory = async (category: { id: number; name: string; description: string }) => {
  const { data } = await api.put(`/product-categories/${category.id}`, category);
  return data;
};

export const deleteProductCategory = async (id: number) => {
  const { data } = await api.delete(`/product-categories/${id}`);
  return data;
};
