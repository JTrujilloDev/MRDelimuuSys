type ShiftSale = {
  status: string;
  total: number;
  discount: number;
  paymentMethod: string | null;
};

export const buildShiftSalesSummary = (accounts: ShiftSale[]) => {
  const summary = {
    totalSales: 0,
    totalDiscounts: 0,
    grossSales: 0,
    cashAmount: 0,
    cardAmount: 0,
    qrAmount: 0,
    creditAmount: 0,
    saleCount: 0,
  };

  for (const account of accounts) {
    if (account.status !== "CLOSED") continue;
    summary.totalSales += Number(account.total);
    summary.totalDiscounts += Number(account.discount);
    summary.saleCount += 1;
    if (account.paymentMethod === "CASH") summary.cashAmount += Number(account.total);
    if (account.paymentMethod === "CARD") summary.cardAmount += Number(account.total);
    if (account.paymentMethod === "QR") summary.qrAmount += Number(account.total);
    if (account.paymentMethod === "CREDIT") summary.creditAmount += Number(account.total);
  }
  summary.grossSales = summary.totalSales + summary.totalDiscounts;
  return summary;
};
