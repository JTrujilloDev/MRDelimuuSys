export type FoundationProduct = {
  name: string;
  totalUnits: 110 | 220;
  portionWeight: 20 | 30 | 50;
  lotRef: string;
  labelAmount: number;
};

type ProductDefinition = Omit<FoundationProduct, "totalUnits"> & {
  totalUnits?: FoundationProduct["totalUnits"];
};

const formatGrams = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const defineProduct = ({ totalUnits = 110, ...product }: ProductDefinition): FoundationProduct => ({
  ...product,
  totalUnits,
});

export const distributeFoundationUnits = (totalUnits: number, labelAmount: number) => {
  const safeLabelAmount = Math.max(1, Math.min(Math.trunc(labelAmount), totalUnits));
  const unitsPerLabel = Math.floor(totalUnits / safeLabelAmount);
  const remainder = totalUnits % safeLabelAmount;
  return Array.from(
    { length: safeLabelAmount },
    (_, index) => unitsPerLabel + (index < remainder ? 1 : 0),
  );
};

export const foundationLabelContent = (product: FoundationProduct, units: number) =>
  `${formatGrams(units * product.portionWeight)} g (${units} und. X ${product.portionWeight} g)`;

export const foundationDistributionSummary = (product: FoundationProduct, labelAmount: number) => {
  const distribution = distributeFoundationUnits(product.totalUnits, labelAmount);
  return `${product.totalUnits} unidades en ${distribution.length} bolsas: ${distribution.join(" + ")}`;
};

export const foundationProducts = {
  pan_blando_50: defineProduct({
    name: "Pan blando",
    portionWeight: 50,
    lotRef: "PB50",
    labelAmount: 4,
  }),
  mogolla_50: defineProduct({
    name: "Mogolla",
    portionWeight: 50,
    lotRef: "MO50",
    labelAmount: 4,
  }),
  mogolla_30: defineProduct({
    name: "Mogolla",
    portionWeight: 30,
    lotRef: "MO30",
    labelAmount: 3,
  }),
  mogolla_integral_50: defineProduct({
    name: "Mogolla integral",
    portionWeight: 50,
    lotRef: "MI50",
    labelAmount: 4,
  }),
  pan_rollo_50: defineProduct({
    name: "Pan rollo",
    portionWeight: 50,
    lotRef: "PR50",
    labelAmount: 4,
  }),
  pan_rollo_30: defineProduct({
    name: "Pan rollo",
    portionWeight: 30,
    lotRef: "PR30",
    labelAmount: 3,
  }),
  pan_maiz_50: defineProduct({
    name: "Pan de maiz",
    portionWeight: 50,
    lotRef: "PM50",
    labelAmount: 4,
  }),
  pan_maiz_30: defineProduct({
    name: "Pan de maiz",
    portionWeight: 30,
    lotRef: "PM30",
    labelAmount: 3,
  }),
  pan_hojaldrado_50: defineProduct({
    name: "Pan hojaldrado",
    portionWeight: 50,
    lotRef: "PH50",
    labelAmount: 4,
  }),
  pan_hojaldrado_30: defineProduct({
    name: "Pan hojaldrado",
    portionWeight: 30,
    lotRef: "PH30",
    labelAmount: 3,
  }),
  croissant_30: defineProduct({
    name: "Croissant",
    portionWeight: 30,
    lotRef: "CR30",
    labelAmount: 3,
  }),
  mantecada: defineProduct({
    name: "Mantecada",
    portionWeight: 30,
    lotRef: "MA",
    labelAmount: 6,
  }),
  torta_queso: defineProduct({
    name: "Torta queso",
    portionWeight: 50,
    lotRef: "TQ",
    labelAmount: 6,
  }),
  torta_quinua: defineProduct({
    name: "Torta quinua",
    portionWeight: 50,
    lotRef: "TQ",
    labelAmount: 6,
  }),
  torta_negra: defineProduct({
    name: "Torta negra",
    portionWeight: 50,
    lotRef: "TN",
    labelAmount: 6,
  }),
  galleta_avena: defineProduct({
    name: "Galleta de avena",
    totalUnits: 220,
    portionWeight: 20,
    lotRef: "GA",
    labelAmount: 3,
  }),
  galleta: defineProduct({
    name: "Galleta",
    totalUnits: 220,
    portionWeight: 20,
    lotRef: "GL",
    labelAmount: 3,
  }),
} satisfies Record<string, FoundationProduct>;
