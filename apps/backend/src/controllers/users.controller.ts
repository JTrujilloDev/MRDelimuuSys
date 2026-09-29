import { Request, Response } from "express";
import {
  createUserService,
  deactivateUserService,
  getAllUsersService,
  updateUserService,
} from "../service/users.service";

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await createUserService(req.body);
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
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

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.auth?.userId) {
      res.status(409).json({ success: false, message: "You cannot deactivate your own user" });
      return;
    }
    const deletedUser = await deactivateUserService(id);
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (
      Number(id) === req.auth?.userId &&
      (req.body.isActive === false || req.body.isGlobalAdmin === false)
    ) {
      res.status(409).json({
        success: false,
        message: "You cannot remove your own active administrator access",
      });
      return;
    }
    const updatedUser = await updateUserService(id, req.body);
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
