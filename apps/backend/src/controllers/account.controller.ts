import { Request, Response } from "express";
import {
  addAccountItemService,
  adjustAccountItemQuantityService,
  closeAccountService,
  createAccountService,
  deleteAccountService,
  getAccountByIdService,
  getAllAccountsService,
  removeAccountItemService,
  updateAccountService,
} from "../service/accounts.service";
import { getIO } from "../socket";

export const createAccount = async (req: Request, res: Response) => {
  try {
    const accountData = req.body;
    const createdAccount = await createAccountService(accountData);
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: createdAccount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getAccountById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await getAccountByIdService(Number(id));
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Account fetched successfully",
      data: account,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const updatedAccount = await updateAccountService(Number(id), updateData);
    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: updatedAccount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required",
      });
    }

    const deletedAccount = await deleteAccountService(Number(id));
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      data: deletedAccount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const getAllAccounts = async (req: Request, res: Response) => {
  const { relatedUserId } = req.params;
  try {
    const accounts = await getAllAccountsService(Number(relatedUserId));
    res.status(200).json({
      success: true,
      message: "Accounts fetched successfully",
      data: accounts,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const addAccountItem = async (req: Request, res: Response) => {
  const { accountId, item } = req.body;
  // Validar estructura del payload
  if (!accountId || !item) {
    return res.status(400).json({
      success: false,
      message: "Missing accountId or item in request body",
    });
  }

  if (!item.productVariantId || !item.quantity) {
    return res.status(400).json({
      success: false,
      message: "Item must contain productVariantId and quantity",
    });
  }

  try {
    const addedItem = await addAccountItemService(Number(accountId), item);

    res.status(200).json({
      success: true,
      message: "Account item added successfully",
      data: addedItem,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const removeAccountItem = async (req: Request, res: Response) => {
  const { accountItemId } = req.body;
  try {
    const removedItem = await removeAccountItemService(Number(accountItemId));
    res.status(200).json({
      success: true,
      message: "Account item removed successfully",
      data: removedItem,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const adjustAccountItemQuantity = async (
  req: Request,
  res: Response,
) => {
  const { accountItemId, delta } = req.body;

  if (!accountItemId || delta === undefined) {
    return res.status(400).json({
      success: false,
      message: "Missing accountItemId or delta in request body",
    });
  }

  if (typeof delta !== "number") {
    return res.status(400).json({
      success: false,
      message: "delta must be a number",
    });
  }

  if (delta !== 1 && delta !== -1) {
    return res.status(400).json({
      success: false,
      message: "delta must be 1 or -1",
    });
  }

  try {
    const updatedAccount = await adjustAccountItemQuantityService({
      accountItemId: Number(accountItemId),
      quantityAdjustment: delta,
    });
    res.status(200).json({
      success: true,
      message: "Account item quantity adjusted successfully",
      data: updatedAccount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const closeAccount = async (req: Request, res: Response) => {
  const { accountId, paymentMethod, cashRegisterId } = req.body;

  try {
    const closedAccount = await closeAccountService(
      {
        accountId: Number(accountId),
        paymentMethod,
        cashRegisterId: Number(cashRegisterId),
      }
    );
    getIO().emit("inventory:updated");
    res.status(200).json({
      success: true,
      message: "Account closed successfully",
      data: closedAccount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
};
