import { api } from "../../../shared/services/api";
import type { Variant } from "../../POS/components/VariantModal";

export const getAllProducts = async () => {
  const { data } = await api.get("/products");
  return data;
};

export const getProductsByCategory = async (id: number) => {
  const { data } = await api.get(`/products/by-category/${id}`);
  return data;
};

export const createProduct = async (product: {
  name: string;
  categoryId: number;
  description: string;
  variants: Array<Variant & { requirePreparation?: boolean }>;
}) => {
  const { data } = await api.post("/products", product);
  return data;
};

export const updateProduct = async (product: {
  id: number;
  name: string;
  categoryId: number;
  productType: string;
  description: string;
  variants: Array<Variant & { requirePreparation?: boolean }>;
}) => {
  const { data } = await api.put(`/products/${product.id}`, product);
  return data;
};

export const deleteProduct = async (id: number) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const getAllActiveProducts = async () => {
  const { data } = await api.get("/products/active");
  return data;
};
