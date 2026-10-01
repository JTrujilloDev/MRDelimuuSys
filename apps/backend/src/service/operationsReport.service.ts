import { prisma } from "../../lib/prisma";
import {
  getReportPeriodKey,
  listReportPeriods,
  type ReportGranularity,
  summarizeReportSales,
} from "./operationsReport.rules";

interface OperationsReportInput {
  from: Date;
  to: Date;
  requestedStoreId?: number;
  requestedGroupId?: number;
  activeStoreId: number;
  isGlobalAdmin: boolean;
  granularity: ReportGranularity;
}

const catalogCost = (
  catalogItems: Array<{ groupId: number; costPrice: number }>,
  groupId: number,
) => Number(catalogItems.find((item) => item.groupId === groupId)?.costPrice ?? 0);

export const getOperationsReportService = async ({
  from,
  to,
  requestedStoreId,
  requestedGroupId,
  activeStoreId,
  isGlobalAdmin,
  granularity,
}: OperationsReportInput) => {
  const groups = await prisma.storeGroup.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      stores: { orderBy: { name: "asc" }, select: { id: true, name: true, groupId: true } },
    },
  });
  const allStores = groups.flatMap((group) => group.stores);
  let storeIds: number[];

  if (!isGlobalAdmin) {
    storeIds = [activeStoreId];
  } else if (requestedStoreId) {
    if (!allStores.some((store) => store.id === requestedStoreId)) {
      throw new Error("Store not found");
    }
    storeIds = [requestedStoreId];
  } else if (requestedGroupId) {
    storeIds = allStores
      .filter((store) => store.groupId === requestedGroupId)
      .map((store) => store.id);
    if (storeIds.length === 0) throw new Error("Store group not found");
  } else {
    storeIds = allStores.map((store) => store.id);
  }

  const [accounts, expenses, losses, inventories] = await Promise.all([
    prisma.account.findMany({
      where: {
        status: "CLOSED",
        closedAt: { gte: from, lte: to },
        terminal: { storeId: { in: storeIds } },
      },
      select: {
        total: true,
        discount: true,
        closedAt: true,
        paymentMethod: true,
        accountItems: {
          select: {
            productVariantId: true,
            productName: true,
            quantity: true,
            subtotal: true,
            unitCost: true,
            productVariant: { select: { name: true } },
          },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      where: {
        type: "EXPENSE",
        createdAt: { gte: from, lte: to },
        cashRegister: { terminal: { storeId: { in: storeIds } } },
      },
      select: { amount: true, createdAt: true },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        storeId: { in: storeIds },
        type: "WASTE",
        createdAt: { gte: from, lte: to },
      },
      select: {
        quantity: true,
        lossReason: true,
        unitCost: true,
        createdAt: true,
      },
    }),
    prisma.storeInventory.findMany({
      where: { storeId: { in: storeIds }, isInitialized: true },
      select: {
        stock: true,
        minStock: true,
        store: { select: { groupId: true } },
        productVariant: {
          select: { catalogItems: { select: { groupId: true, costPrice: true } } },
        },
      },
    }),
  ]);

  const sales = summarizeReportSales(accounts.map((account) => ({
    total: Number(account.total),
    discount: Number(account.discount),
    items: account.accountItems.map((item) => ({
      productVariantId: item.productVariantId,
      productName: item.productName,
      variantName: item.productVariant.name,
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      unitCost: Number(item.unitCost),
    })),
  })));
  const totalExpenses = expenses.reduce((sum, expense) => sum + Math.abs(Number(expense.amount)), 0);
  const lossCost = losses.reduce(
    (sum, loss) => sum + (loss.unitCost === null ? 0 : Math.abs(loss.quantity) * Number(loss.unitCost)),
    0,
  );
  const unvaluedLossMovements = losses.filter((loss) => loss.unitCost === null).length;
  const lossesByReason = losses.reduce<Record<string, number>>((result, loss) => {
    const reason = loss.lossReason ?? "UNCLASSIFIED";
    result[reason] = (result[reason] ?? 0) + Math.abs(loss.quantity);
    return result;
  }, {});
  const inventoryValue = inventories.reduce((sum, inventory) =>
    sum + inventory.stock * catalogCost(inventory.productVariant.catalogItems, inventory.store.groupId), 0);
  const operationalSummary = {
    grossSales: sales.grossSales,
    discounts: sales.discounts,
    netSales: sales.netSales,
    saleCount: sales.saleCount,
    units: sales.units,
    ticketAverage: sales.saleCount ? sales.netSales / sales.saleCount : 0,
    expenses: totalExpenses,
    outOfStock: inventories.filter((item) => item.stock <= 0).length,
    lowStock: inventories.filter((item) => item.stock > 0 && item.minStock > 0 && item.stock <= item.minStock).length,
  };
  const timelineByPeriod = new Map(
    listReportPeriods(from, to, granularity).map((period) => [period, {
      period,
      grossSales: 0,
      discounts: 0,
      netSales: 0,
      saleCount: 0,
      cash: 0,
      card: 0,
      qr: 0,
      credit: 0,
      costOfSales: 0,
      estimatedMargin: 0,
      expenses: 0,
      lossCost: 0,
      operatingResult: 0,
    }]),
  );

  for (const account of accounts) {
    if (!account.closedAt) continue;
    const point = timelineByPeriod.get(getReportPeriodKey(account.closedAt, granularity));
    if (!point) continue;
    const total = Number(account.total);
    const discount = Number(account.discount);
    const cost = account.accountItems.reduce(
      (sum, item) => sum + Number(item.unitCost) * item.quantity,
      0,
    );
    point.grossSales += total + discount;
    point.discounts += discount;
    point.netSales += total;
    point.saleCount += 1;
    point.costOfSales += cost;
    if (account.paymentMethod === "CASH") point.cash += total;
    if (account.paymentMethod === "CARD") point.card += total;
    if (account.paymentMethod === "QR") point.qr += total;
    if (account.paymentMethod === "CREDIT") point.credit += total;
  }
  for (const expense of expenses) {
    const point = timelineByPeriod.get(getReportPeriodKey(expense.createdAt, granularity));
    if (point) point.expenses += Math.abs(Number(expense.amount));
  }
  for (const loss of losses) {
    if (loss.unitCost === null) continue;
    const point = timelineByPeriod.get(getReportPeriodKey(loss.createdAt, granularity));
    if (point) point.lossCost += Math.abs(loss.quantity) * Number(loss.unitCost);
  }
  const timeline = Array.from(timelineByPeriod.values()).map((point) => {
    point.estimatedMargin = point.netSales - point.costOfSales;
    point.operatingResult = point.estimatedMargin - point.expenses - point.lossCost;
    if (isGlobalAdmin) return point;
    const { costOfSales: _cost, estimatedMargin: _margin, lossCost: _loss, operatingResult: _result, ...operationalPoint } = point;
    return operationalPoint;
  });

  return {
    scope: {
      groups: isGlobalAdmin ? groups : [],
      selectedStoreIds: storeIds,
      from,
      to,
      granularity,
    },
    summary: isGlobalAdmin
      ? {
          ...operationalSummary,
          costOfSales: sales.costOfSales,
          estimatedMargin: sales.estimatedMargin,
          lossCost,
          operatingResult: sales.estimatedMargin - lossCost - totalExpenses,
          inventoryValue,
        }
      : operationalSummary,
    products: isGlobalAdmin ? sales.products : sales.products.map(({ costOfSales: _cost, estimatedMargin: _margin, ...product }) => product),
    losses: {
      movements: losses.length,
      unvaluedMovements: unvaluedLossMovements,
      unitsByReason: lossesByReason,
      ...(isGlobalAdmin && { estimatedCost: lossCost }),
    },
    timeline,
    canViewCosts: isGlobalAdmin,
  };
};
