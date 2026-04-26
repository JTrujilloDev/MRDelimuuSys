import { Request, Response } from "express";
import {  createCategoryService, deleteCategoryService, getAllCategoriesService, updateCategoryService } from "../service/productCategories.service";

export const createCategory = async (req : Request, res : Response) => {
  try {
    const category = await createCategoryService(req.body);
    res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
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

export const getAllCategories = async (req : Request, res : Response) => {
  try {
    const categories = await getAllCategoriesService();
    res.status(200).json({
        success: true,
        message: "Categories fetched successfully",
        data: categories,
    });
  } catch (error) {
    res.status(400).json({
        success: false,
        message: (error as Error).message,
    });
  }
};

export const deleteCategory = async (req : Request, res : Response) => {
  try {
    const { id } = req.params;
    const deletedCategory = await deleteCategoryService(Number(id));
    res.status(200).json({
        success: true,
        message: "Category deleted successfully",
        data: deletedCategory,
    });
  } catch (error) {
    res.status(400).json({
        success: false,
        message: (error as Error).message,
    });
  }

}

export const updateCategory = async (req : Request, res : Response) => {
  try {
    const { id } = req.params;
    const updatedCategory = await updateCategoryService(Number(id), req.body);
    res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
    });
  } catch (error) {
    res.status(400).json({
        success: false,
        message: (error as Error).message,
    });
  }
}
