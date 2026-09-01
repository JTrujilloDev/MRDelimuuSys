import { Account, AccountItem, Prisma } from "../../generated/prisma/client";
import { AccountStatus, PaymentMethod } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  UpdateCashRegisterTotalsInput,
  updateCashRegisterTotalsTx,
} from "./cashRegister.service";

interface CreateAccountItem {
  productVariantId: number;
  productName?: string;
  quantity?: number;
  price: number;
  subtotal?: number;
}

interface AccountData extends Omit<
  Account,
  "accountItems" | "id" | "createdAt" | "updatedAt"
> {
  accountItems?: CreateAccountItem[];
}

const validateRecipeAvailabilityForAccount = async (
  tx: Prisma.TransactionClient,
  accountId: number,
) => {
  const recipeAccountItems = await tx.accountItem.findMany({
    where: {
      accountId,
      quantity: { gt: 0 },
      productVariant: {
        product: { productType: "RECIPE_PRODUCT" },
      },
    },
    select: {
      quantity: true,
      productVariant: {
        select: {
          name: true,
          product: { select: { name: true } },
          recipeItems: {
            select: {
              quantity: true,
              ingredientVariantId: true,
              ingredientVariant: {
                select: {
                  name: true,
                  stock: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const ingredientConsumption = new Map<
    number,
    {
      productName: string;
      variantName: string;
      stock: number;
      requiredQuantity: number;
    }
  >();

  for (const accountItem of recipeAccountItems) {
    const { productVariant } = accountItem;

    if (productVariant.recipeItems.length === 0) {
      throw new Error(
        `${productVariant.product.name} · ${productVariant.name} no tiene una receta configurada`,
      );
    }

    for (const recipeItem of productVariant.recipeItems) {
      if (recipeItem.quantity <= 0) {
        throw new Error(
          `La receta de ${productVariant.name} contiene una cantidad inválida`,
        );
      }

      const current = ingredientConsumption.get(
        recipeItem.ingredientVariantId,
      );
      ingredientConsumption.set(recipeItem.ingredientVariantId, {
        productName: recipeItem.ingredientVariant.product.name,
        variantName: recipeItem.ingredientVariant.name,
        stock: recipeItem.ingredientVariant.stock,
        requiredQuantity:
          (current?.requiredQuantity ?? 0) +
          recipeItem.quantity * accountItem.quantity,
      });
    }
  }

  for (const ingredient of ingredientConsumption.values()) {
    if (ingredient.stock < ingredient.requiredQuantity) {
      throw new Error(
        `Stock insuficiente: ${ingredient.productName} · ${ingredient.variantName}. Disponible: ${ingredient.stock}; requerido: ${ingredient.requiredQuantity}`,
      );
    }
  }
};

export const createAccountService = async (data: AccountData) => {
  return await prisma.$transaction(async (tx) => {
    if (!data.userId) {
      throw new Error("userId is required");
    }

    if (!data.name) {
      throw new Error("name is required");
    }

    // 4. Crear cuenta (solo datos básicos)
    const newAccount = await tx.account.create({
      data: {
        userId: data.userId,
        name: data.name,
        terminalId: data.terminalId,
      },
      include: {
        accountItems: true,
      },
    });

    return newAccount;
  });
};

export const getAccountByIdService = async (accountId: number) => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      accountItems: true,
    },
  });
  return account;
};

interface AccountUpdateData {
  userId?: number;
  name?: string;
  terminalId?: number;
  tableNumber?: number[];
  status?: AccountStatus;
  createdAt?: Date;
  updatedAt?: Date;
  total?: number;
  discount?: number;
  discountObservation?: string;
  closedAt?: Date;
  paymentMethod?: PaymentMethod;
  customerId?: number;
}

export const updateAccountService = async (
  accountId: number,
  data: AccountUpdateData,
) => {
  return await prisma.$transaction(async (tx) => {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Account name cannot be empty");
    }

    // 1. Buscar cuenta
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: { accountItems: true },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // 2. Evitar modificar cuentas cerradas
    if (account.status !== "OPEN") {
      throw new Error("Cannot update a closed account");
    }

    // 3. Campos permitidos (whitelist)
    const allowedData: Partial<AccountUpdateData> = {
      name: data.name?.trim(),
      customerId: data.customerId,
      tableNumber: data.tableNumber,
      terminalId: data.terminalId,
      discount: data.discount,
      discountObservation: data.discountObservation,
    };

    // 4. Recalcular total si hay descuento
    let total = account.accountItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    const previousDiscount = account.discount || 0;
    const newDiscount =
      allowedData.discount !== undefined
        ? allowedData.discount
        : previousDiscount;

    if (newDiscount > 0) {
      if (newDiscount > total) {
        throw new Error("Discount cannot be greater than total");
      }

      total = total - newDiscount;
    }

    // 5. Actualizar cuenta
    const updatedAccount = await tx.account.update({
      where: { id: accountId },
      data: {
        ...allowedData,
        total,
      },
      include: {
        accountItems: true,
      },
    });

    return updatedAccount;
  });
};

export const deleteAccountService = async (accountId: number) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verificar que la cuenta exista
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: { accountItems: true },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status !== "OPEN") {
      throw new Error("Only open accounts can be deleted");
    }

    const activeKitchenTickets = await tx.kitchenTicket.count({
      where: { accountId, status: { not: "DELIVERED" } },
    });

    if (activeKitchenTickets > 0) {
      throw new Error("No se puede eliminar una cuenta con comandas activas");
    }

    await tx.kitchenTicket.deleteMany({ where: { accountId } });

    // Eliminar la cuenta y sus productos abiertos en cascada.
    const deletedAccount = await tx.account.delete({
      where: { id: accountId },
    });

    return deletedAccount;
  });
};

export const getAllAccountsService = async (relatedUserId: number) => {
  const accounts = await prisma.account.findMany({
    where: {
      userId: relatedUserId,
      status: "OPEN",
    },
    include: {
      accountItems: {
        include: {
          productVariant: {
            select: { id: true, requirePreparation: true },
          },
        },
      },
    },
  });
  return accounts;
};

export const addAccountItemService = async (
  accountId: number,
  item: CreateAccountItem,
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Validar cuenta
    const account = await tx.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status !== "OPEN") {
      throw new Error("Cannot modify a closed account");
    }

    // 2. Obtener producto
    const product = await tx.productVariant.findUnique({
      where: { id: item.productVariantId },
      include: { product: { select: { name: true } } },
    });

    if (!product || !product.isActive) {
      throw new Error("Product not found or inactive");
    }

    // 3. Validar cantidad
    const quantityToAdd = item.quantity ?? 1;

    if (quantityToAdd <= 0) {
      throw new Error("Invalid quantity");
    }

    // 4. Precio desde backend
    const price = Number(product.retailPrice);

    // 5. Buscar si ya existe el item en la cuenta
    const existingItem = await tx.accountItem.findFirst({
      where: {
        accountId,
        productVariantId: product.id,
      },
    });

    if (existingItem) {
      // 👉 actualizar cantidad
      const newQuantity = existingItem.quantity + quantityToAdd;

      await tx.accountItem.update({
        where: { id: existingItem.id },
        data: {
          productName: `${product.product.name} - ${product.name}`,
          quantity: newQuantity,
          subtotal: newQuantity * price,
        },
      });
    } else {
      // 👉 crear nuevo item
      await tx.accountItem.create({
        data: {
          accountId,
          productVariantId: product.id,
          productName: `${product.product.name} - ${product.name}`,
          quantity: quantityToAdd,
          price,
          subtotal: quantityToAdd * price,
        },
      });
    }

    await validateRecipeAvailabilityForAccount(tx, accountId);

    // 6. Recalcular total (seguro)
    const items = await tx.accountItem.findMany({
      where: { accountId },
    });

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);

    // 7. Actualizar cuenta
    const updatedAccount = await tx.account.update({
      where: { id: accountId },
      data: { total },
      include: { accountItems: true },
    });

    return updatedAccount;
  });
};

export const removeAccountItemService = async (accountItemId: number) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Buscar item
    const item = await tx.accountItem.findUnique({
      where: { id: accountItemId },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    // 2. Validar cuenta
    const account = await tx.account.findUnique({
      where: { id: item.accountId },
      include: { accountItems: true },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status !== "OPEN") {
      throw new Error("Cannot modify a closed account");
    }

    // 3. Eliminar item
    await tx.accountItem.delete({
      where: { id: accountItemId },
    });

    // 4. Recalcular total
    const remainingItems = account.accountItems.filter(
      (i) => i.id !== accountItemId,
    );

    const total = remainingItems.reduce((sum, i) => sum + i.subtotal, 0);

    // 5. Actualizar cuenta
    const updatedAccount = await tx.account.update({
      where: { id: account.id },
      data: { total },
      include: { accountItems: true },
    });

    return updatedAccount;
  });
};

export const adjustAccountItemQuantityService = async ({
  accountItemId,
  quantityAdjustment,
}: {
  accountItemId: number;
  quantityAdjustment: number;
}) => {
  // Validar que el ajuste sea solo de 1 en 1
  if (quantityAdjustment !== 1 && quantityAdjustment !== -1) {
    throw new Error("Quantity adjustment must be 1 or -1");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Buscar item
    const item = await tx.accountItem.findUnique({
      where: { id: accountItemId },
      include: { account: true },
    });

    if (!item) {
      throw new Error("Account item not found");
    }

    // 2. Validar cuenta
    if (item.account.status !== "OPEN") {
      throw new Error("Cannot modify a closed account");
    }

    // 3. Calcular nueva cantidad
    const newQuantity = item.quantity + quantityAdjustment;

    if (newQuantity <= 0) {
      // Si la cantidad es 0 o negativa, eliminar el item
      await tx.accountItem.delete({
        where: { id: accountItemId },
      });
    } else {
      // Actualizar cantidad y subtotal
      await tx.accountItem.update({
        where: { id: accountItemId },
        data: {
          quantity: newQuantity,
          subtotal: newQuantity * item.price,
        },
      });
    }

    await validateRecipeAvailabilityForAccount(tx, item.accountId);

    // 4. Recalcular total de la cuenta
    const remainingItems = await tx.accountItem.findMany({
      where: { accountId: item.accountId },
    });

    const total = remainingItems.reduce((sum, i) => sum + i.subtotal, 0);

    // 5. Actualizar cuenta
    const updatedAccount = await tx.account.update({
      where: { id: item.accountId },
      data: { total },
      include: { accountItems: true },
    });

    return updatedAccount;
  });
};

export const closeAccountService = async ({
  accountId,
  paymentMethod,
  cashRegisterId,
}: {
  accountId: number;
  paymentMethod: PaymentMethod;
  cashRegisterId: number;
}) => {
  return await prisma.$transaction(async (tx) => {
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    if (!Number.isInteger(cashRegisterId) || cashRegisterId <= 0) {
      throw new Error("Invalid cash register");
    }

    // Reclamar la cuenta de forma atómica. Una segunda solicitud concurrente
    // esperará esta transacción y no podrá procesar la misma venta otra vez.
    const claimedAccount = await tx.account.updateMany({
      where: { id: accountId, status: "OPEN" },
      data: { status: "CLOSED" },
    });

    if (claimedAccount.count === 0) {
      const existingAccount = await tx.account.findUnique({
        where: { id: accountId },
        select: { id: true },
      });
      throw new Error(
        existingAccount ? "Account already closed" : "Account not found",
      );
    }

    // 1. Obtener cuenta ya reclamada
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: {
        accountItems: {
          include: {
            productVariant: {
              include: { product: { include: { category: true } } },
            },
          },
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.accountItems.length) {
      throw new Error("Cannot close empty account");
    }

    const cashRegister = await tx.cashRegister.findUnique({
      where: { id: cashRegisterId },
      select: { id: true, status: true, terminalId: true },
    });

    if (!cashRegister || cashRegister.status !== "OPEN") {
      throw new Error("Cash register not found or closed");
    }

    if (cashRegister.terminalId !== account.terminalId) {
      throw new Error("Cash register does not belong to the account terminal");
    }

    const pendingKitchenAdjustments =
      await tx.kitchenTicketAdjustment.count({
        where: {
          status: "PENDING",
          kitchenTicket: { accountId },
        },
      });

    if (pendingKitchenAdjustments > 0) {
      throw new Error(
        "No se puede cobrar mientras cocina tenga cancelaciones pendientes de confirmar",
      );
    }

    // 2. Calcular total
    const total = account.accountItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    // 3.1 Validar stock de FINISHED_PRODUCT y THIRD_PARTY_PRODUCT
    const finishedProductIds = account.accountItems
      .filter(
        (i) => i.productVariant.product.productType === "FINISHED_PRODUCT" || i.productVariant.product.productType === "THIRD_PARTY_PRODUCT",
      )
      .map((i) => i.productVariantId);

    const products = await tx.productVariant.findMany({
      where: {
        id: { in: finishedProductIds },
      },
    });

    const finishedProductMap = new Map(products.map((p) => [p.id, p]));

    for (const item of account.accountItems) {
      if (item.productVariant.product.productType !== "FINISHED_PRODUCT" && item.productVariant.product.productType !== "THIRD_PARTY_PRODUCT") {
        continue;
      }

      const product = finishedProductMap.get(item.productVariantId);

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente: ${item.productVariant.product.name} · ${item.productVariant.name}. Disponible: ${product.stock}; requerido: ${item.quantity}`,
        );
      }
    }

    // 3.2 Validar stock de RECIPE_PRODUCT

    const recipeProductIds = account.accountItems
      .filter((i) => i.productVariant.product.productType === "RECIPE_PRODUCT")
      .map((i) => i.productVariantId);

    const recipeProducts = await tx.productVariant.findMany({
      where: {
        id: {
          in: recipeProductIds,
        },
      },
      include: {
        recipeItems: {
          include: {
            ingredientVariant: true,
          },
        },
      },
    });

    const recipeProductMap = new Map(recipeProducts.map((p) => [p.id, p]));

    // Acumular consumo total de ingredientes
    const ingredientConsumption = new Map<number, number>();

    for (const item of account.accountItems) {
      if (item.productVariant.product.productType !== "RECIPE_PRODUCT") {
        continue;
      }

      const recipeProduct = recipeProductMap.get(item.productVariantId);

      if (!recipeProduct) {
        throw new Error("Recipe product not found");
      }

      if (recipeProduct.recipeItems.length === 0) {
        throw new Error(
          `La variante ${recipeProduct.name} no tiene una receta configurada`,
        );
      }

      for (const recipeItem of recipeProduct.recipeItems) {
        const requiredQuantity = recipeItem.quantity * item.quantity;

        const current =
          ingredientConsumption.get(recipeItem.ingredientVariantId) ?? 0;

        ingredientConsumption.set(
          recipeItem.ingredientVariantId,
          current + requiredQuantity,
        );
      }
    }

    const ingredientIds = [...ingredientConsumption.keys()];

    const ingredients = await tx.productVariant.findMany({
      where: {
        id: {
          in: ingredientIds,
        },
      },
      include: {
        product: { select: { name: true } },
      },
    });

    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

    for (const [ingredientId, requiredQuantity] of ingredientConsumption) {
      const ingredient = ingredientMap.get(ingredientId);

      if (!ingredient) {
        throw new Error("Ingredient not found");
      }

      if (ingredient.stock < requiredQuantity) {
        throw new Error(
          `Stock insuficiente: ${ingredient.product.name} · ${ingredient.name}. Disponible: ${ingredient.stock}; requerido: ${requiredQuantity}`,
        );
      }
    }

    // 4. Inventario
    for (const item of account.accountItems) {
      const productType = item.productVariant.product.productType;

      if (productType === "FINISHED_PRODUCT" || productType === "THIRD_PARTY_PRODUCT") {
        const product = finishedProductMap.get(item.productVariantId)!;

        await tx.inventoryTransaction.create({
          data: {
            productVariantId: product.id,
            relatedAccountId: accountId,
            quantity: -item.quantity,
            unit: product.unit,
            type: "SALE",
          },
        });

        await tx.productVariant.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        continue;
      }

      if (productType === "RECIPE_PRODUCT") {
        const recipeProduct = recipeProductMap.get(item.productVariantId);

        if (!recipeProduct) {
          throw new Error("Recipe product not found");
        }

        for (const recipeItem of recipeProduct.recipeItems) {
          const consumedQuantity = recipeItem.quantity * item.quantity;

          await tx.inventoryTransaction.create({
            data: {
              productVariantId: recipeItem.ingredientVariantId,
              relatedAccountId: accountId,
              quantity: -consumedQuantity,
              unit: recipeItem.ingredientVariant.unit,
              type: "SALE",
            },
          });

          await tx.productVariant.update({
            where: {
              id: recipeItem.ingredientVariantId,
            },
            data: {
              stock: {
                decrement: consumedQuantity,
              },
            },
          });
        }
      }
    }

    // 5. Transacción financiera
    const financialTransaction = await tx.financialTransaction.create({
      data: {
        type: "SALE",
        amount: total,
        paymentMethod,
        relatedAccountId: accountId,
        relatedCashRegisterId: cashRegisterId,
      },
    });

    // 🔥 6. Actualizar caja según método de pago
    const cashRegisterUpdate: UpdateCashRegisterTotalsInput = {
      cashRegisterId,
      saleAmount: total,
      discountAmount: account.discount || 0,
    };

    if (paymentMethod === "CASH") {
      cashRegisterUpdate.cashAmount = total;
    }

    if (paymentMethod === "CARD") {
      cashRegisterUpdate.cardAmount = total;
    }

    if (paymentMethod === "QR") {
      cashRegisterUpdate.qrAmount = total;
    }

    if (paymentMethod === "CREDIT") {
      cashRegisterUpdate.creditAmount = total;
    }

    await updateCashRegisterTotalsTx(tx, cashRegisterUpdate);

    // 7. Cerrar cuenta
    const updatedAccount = await tx.account.update({
      where: { id: accountId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        paymentMethod,
        total,
        financialTransactionId: financialTransaction.id,
        cashRegisterId,
      },
      include: {
        accountItems: true,
      },
    });

    return updatedAccount;
  });
};
