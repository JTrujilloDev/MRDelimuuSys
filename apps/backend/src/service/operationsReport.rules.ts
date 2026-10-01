type ReportSale = {
  total: number;
  discount: number;
  items: Array<{
    productVariantId: number;
    productName: string;
    variantName: string;
    quantity: number;
    subtotal: number;
    unitCost: number;
  }>;
};

export const summarizeReportSales = (sales: ReportSale[]) => {
  const products = new Map<number, {
    productVariantId: number;
    productName: string;
    variantName: string;
    units: number;
    grossSales: number;
    discounts: number;
    netSales: number;
    costOfSales: number;
    estimatedMargin: number;
  }>();

  let grossSales = 0;
  let discounts = 0;
  let netSales = 0;
  let costOfSales = 0;

  for (const sale of sales) {
    const saleGross = sale.total + sale.discount;
    grossSales += saleGross;
    discounts += sale.discount;
    netSales += sale.total;

    for (const item of sale.items) {
      const itemGross = Number(item.subtotal);
      const allocatedDiscount = saleGross > 0
        ? sale.discount * (itemGross / saleGross)
        : 0;
      const itemCost = Number(item.unitCost) * item.quantity;
      const current = products.get(item.productVariantId) ?? {
        productVariantId: item.productVariantId,
        productName: item.productName,
        variantName: item.variantName,
        units: 0,
        grossSales: 0,
        discounts: 0,
        netSales: 0,
        costOfSales: 0,
        estimatedMargin: 0,
      };
      current.units += item.quantity;
      current.grossSales += itemGross;
      current.discounts += allocatedDiscount;
      current.netSales += itemGross - allocatedDiscount;
      current.costOfSales += itemCost;
      current.estimatedMargin = current.netSales - current.costOfSales;
      products.set(item.productVariantId, current);
      costOfSales += itemCost;
    }
  }

  return {
    grossSales,
    discounts,
    netSales,
    costOfSales,
    estimatedMargin: netSales - costOfSales,
    saleCount: sales.length,
    units: Array.from(products.values()).reduce((sum, item) => sum + item.units, 0),
    products: Array.from(products.values()).sort((a, b) => b.netSales - a.netSales),
  };
};
