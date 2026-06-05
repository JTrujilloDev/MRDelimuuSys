export const transactionTypes = {
  PURCHASE: {
    label: "Compra",
    value: "PURCHASE",
    className: "bg-[#3b82f6]/20 text-[#3b82f6]",
  },
  ADJUSTMENT: {
    label: "Ajuste",
    value: "ADJUSTMENT",
    className: "bg-[#facc15]/20 text-[#ca8a04]",
  },
  RETURN: {
    label: "Devolución",
    value: "RETURN",
    className: "bg-[#8E51FF]/20 text-[#8E51FF]",
  },
  WASTE: {
    label: "Merma",
    value: "WASTE",
    className: "bg-[#ef4444]/20 text-[#ef4444]",
  },
  PRODUCTION: {
    label: "Producción",
    value: "PRODUCTION",
    className: "bg-[#06b6d4]/20 text-[#0891b2]",
  },
  INITIAL: {
    label: "Inventario inicial",
    value: "INITIAL",
    className: "bg-[#FF7B1E]/20 text-[#FF7B1E]",
  },
  WHOLESALE: {
    label: "Venta al por mayor",
    value: "WHOLESALE",
    className: "bg-[#10b981]/20 text-[#10b981]",
  },
  SALE: {
    label: "Venta POS",
    value: "SALE",
    className: "bg-[#10b981]/20 text-[#10b981]",
  },
  INTERNAL_CONSUMPTION: {
    label: "Consumo interno",
    value: "INTERNAL_CONSUMPTION",
    className: "bg-[#ef4410]/20 text-[#ef4410]",
  },
};

export const inventoryTransactionsByProductType = {
  INGREDIENT: [
    transactionTypes.PURCHASE,
    transactionTypes.ADJUSTMENT,
    transactionTypes.WASTE,
    transactionTypes.INTERNAL_CONSUMPTION,
  ],
  RECIPE_PRODUCT: [],
  FINISHED_PRODUCT: [
    transactionTypes.ADJUSTMENT,
    transactionTypes.RETURN,
    transactionTypes.WASTE,
    transactionTypes.PRODUCTION,
    transactionTypes.WHOLESALE,
    transactionTypes.INTERNAL_CONSUMPTION,
  ],
  THIRD_PARTY_PRODUCT: [
    transactionTypes.PURCHASE,
    transactionTypes.ADJUSTMENT,
    transactionTypes.RETURN,
    transactionTypes.WASTE,
    transactionTypes.INTERNAL_CONSUMPTION,
  ],
  PREPARED_BASE: [
    transactionTypes.ADJUSTMENT,
    transactionTypes.WASTE,
    transactionTypes.PRODUCTION,
    transactionTypes.WHOLESALE,
    transactionTypes.INTERNAL_CONSUMPTION,
  ],
  NEW_VARIANT: [transactionTypes.INITIAL],
};
