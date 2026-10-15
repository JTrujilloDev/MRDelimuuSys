export type FoundationProduct = {
  name: string;
  content: string;
  portionWeight: 20 | 30 | 50;
  lotRef: string;
  labelAmount: number;
};

export const foundationProducts = {
  pan_blando_50: {
    name: "Pan blando",
    content: "2.650 g (53 und. X 50 g)",
    portionWeight: 50,
    lotRef: "PB50",
    labelAmount: 3,
  },
  mogolla_50: {
    name: "Mogolla",
    content: "2.650 g (53 und. X 50 g)",
    portionWeight: 50,
    lotRef: "MO50",
    labelAmount: 3,
  },
  mogolla_30: {
    name: "Mogolla",
    content: "1.500 g (50 und. X 30 g)",
    portionWeight: 30,
    lotRef: "MO30",
    labelAmount: 3,
  },
  mogolla_integral_50: {
    name: "Mogolla integral",
    content: "2.650 g (53 und. X 50 g)",
    portionWeight: 50,
    lotRef: "MI50",
    labelAmount: 3,
  },
  pan_rollo_50: {
    name: "Pan rollo",
    content: "2.650 g (53 und. X 50 g)",
    portionWeight: 50,
    lotRef: "PR50",
    labelAmount: 3,
  },
  pan_rollo_30: {
    name: "Pan rollo",
    content: "1.650 g (55 und. X 30 g)",
    portionWeight: 30,
    lotRef: "PR30",
    labelAmount: 3,
  },
  pan_maiz_50: {
    name: "Pan de maiz",
    content: "2.650 g (53 und. X 50 g)",
    portionWeight: 50,
    lotRef: "PM50",
    labelAmount: 3,
  },
  pan_maiz_30: {
    name: "Pan de maiz",
    content: "1.650 g (55 und. X 30 g)",
    portionWeight: 30,
    lotRef: "PM30",
    labelAmount: 3,
  },
  pan_hojaldrado_50: {
    name: "Pan hojaldrado",
    content: "2.650 g (53 und. X 50 g)",
    portionWeight: 50,
    lotRef: "PH50",
    labelAmount: 2,
  },
  pan_hojaldrado_30: {
    name: "Pan hojaldrado",
    content: "1.650 g (55 und. X 30 g)",
    portionWeight: 30,
    lotRef: "PH30",
    labelAmount: 2,
  },
  croissant_30: {
    name: "Croissant",
    content: "1.650 g (55 und. X 30 g)",
    portionWeight: 30,
    lotRef: "CR30",
    labelAmount: 3,
  },
  mantecada: {
    name: "Mantecada",
    content: "750 g (25 und. X 30 g)",
    portionWeight: 30,
    lotRef: "MA",
    labelAmount: 6,
  },
  torta_queso: {
    name: "Torta queso",
    content: "1.250 g (25 und. X 50 g)",
    portionWeight: 50,
    lotRef: "TQ",
    labelAmount: 6,
  },
  torta_quinua: {
    name: "Torta quinua",
    content: "1.250 g (25 und. X 50 g)",
    portionWeight: 50,
    lotRef: "TQ",
    labelAmount: 6,
  },
  torta_negra: {
    name: "Torta negra",
    content: "1.250 g (25 und. X 50 g)",
    portionWeight: 50,
    lotRef: "TN",
    labelAmount: 6,
  },
  galleta_avena: {
    name: "Galleta de avena",
    content: "2.000 g (100 und. X 20 g)",
    portionWeight: 20,
    lotRef: "GA",
    labelAmount: 3,
  },
  galleta: {
    name: "Galleta",
    content: "2.000 g (100 und. X 20 g)",
    portionWeight: 20,
    lotRef: "GL",
    labelAmount: 3,
  },
} as const satisfies Record<string, FoundationProduct>;
