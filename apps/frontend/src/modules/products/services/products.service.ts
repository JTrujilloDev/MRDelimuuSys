import { api } from "../../../shared/services/api";

export interface ProductPayload {
  id?: number;
  name: string;
  categoryId: number;
  productType: string;
  description: string;
  variants: Array<{
    id?: number;
    name: string;
    retailPrice: number;
    wholesalePrice: number;
    minStock: number;
    productCost: number;
    isActive: boolean;
    requirePreparation: boolean;
    unit: string;
    recipeItems: Array<{
      ingredientVariantId: number;
      quantity: number;
    }>;
  }>;
}

export const getAllProducts = async () => {
  const { data } = await api.get("/products");
  return data;
};

export const getProductsByCategory = async (id: number) => {
  const { data } = await api.get(`/products/by-category/${id}`);
  return data;
};

export const createProduct = async (product: ProductPayload) => {
  const { data } = await api.post("/products", product);
  return data;
};

export const updateProduct = async (
  product: ProductPayload & { id: number },
) => {
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
