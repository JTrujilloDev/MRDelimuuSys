import { Request, Response } from "express";
import { createCustomerService, deleteCustomerService, getAllCustomersService, getCustomerByIdService, updateCustomerService } from "../service/customer.service";
import { Customer } from "../../generated/prisma/client";

export const  createCustomer = async (req: Request, res: Response) => {
  try {
    const customerData: Customer = req.body;
    const newCustomer = await createCustomerService(customerData);
    res.status(201).json({
      success: true,
        message: "Customer created successfully",
        data: newCustomer,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    const statusCode = errorMessage.includes("already exists") ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
  }

  export const getCustomerById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const customer = await getCustomerByIdService(Number(id));
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Customer fetched successfully",
        data: customer,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  };

export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await getAllCustomersService();
    res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customers,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedCustomer = await updateCustomerService(Number(id), req.body);
    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedCustomer = await deleteCustomerService(Number(id));
    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: deletedCustomer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};