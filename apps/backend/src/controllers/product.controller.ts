import { Request, Response } from "express";
import {
  createProductService,
  deleteProductService,
  getAllActiveProductsService,
  getAllProductsService,
  getProductByIdService,
  getProductsByCategoryService,
  updateProductService,
} from "../service/product.service";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const newProduct = await createProductService(req.body);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    const statusCode = errorMessage.includes("already exists") ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await getAllProductsService();
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductByIdService(Number(id));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedProduct = await deleteProductService(Number(id));
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: deletedProduct,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedProduct = await updateProductService(Number(id), req.body);
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productByCategory = await getProductsByCategoryService(Number(id));
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: productByCategory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getAllActiveProducts = async (req: Request, res: Response) => {
  try {
    const products = await getAllActiveProductsService();
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
