import { foundationProducts } from "./fundationProducts.ts";

export const foundationMenu = [
  {
    week: 1,
    days: {
      monday: { name: "Lunes", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: null, afternoonSnack: null } },
      tuesday: { name: "Martes", meals: { breakfast: foundationProducts.mogolla_integral_50, morningSnack: foundationProducts.torta_queso, afternoonSnack: foundationProducts.mantecada } },
      wednesday: { name: "Miércoles", meals: { breakfast: null, morningSnack: foundationProducts.torta_quinua, afternoonSnack: foundationProducts.croissant_30 } },
      thursday: { name: "Jueves", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: null, afternoonSnack: foundationProducts.pan_rollo_30 } },
      friday: { name: "Viernes", meals: { breakfast: foundationProducts.pan_rollo_50, morningSnack: foundationProducts.galleta_avena, afternoonSnack: null } },
      saturday: { name: "Sábado", meals: { breakfast: foundationProducts.mogolla_integral_50, morningSnack: foundationProducts.mantecada, afternoonSnack: null } },
      sunday: { name: "Domingo", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: foundationProducts.croissant_30, afternoonSnack: foundationProducts.torta_negra } },
    },
  },
  {
    week: 2,
    days: {
      monday: { name: "Lunes", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: foundationProducts.torta_quinua, afternoonSnack: null } },
      tuesday: { name: "Martes", meals: { breakfast: null, morningSnack: foundationProducts.mogolla_30, afternoonSnack: null } },
      wednesday: { name: "Miércoles", meals: { breakfast: foundationProducts.pan_hojaldrado_50, morningSnack: null, afternoonSnack: null } },
      thursday: { name: "Jueves", meals: { breakfast: foundationProducts.pan_maiz_50, morningSnack: foundationProducts.torta_queso, afternoonSnack: foundationProducts.torta_quinua } },
      friday: { name: "Viernes", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: foundationProducts.croissant_30, afternoonSnack: foundationProducts.pan_rollo_30 } },
      saturday: { name: "Sábado", meals: { breakfast: null, morningSnack: null, afternoonSnack: foundationProducts.mogolla_30 } },
      sunday: { name: "Domingo", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: foundationProducts.croissant_30, afternoonSnack: foundationProducts.mantecada } },
    },
  },
  {
    week: 3,
    days: {
      monday: { name: "Lunes", meals: { breakfast: foundationProducts.pan_maiz_50, morningSnack: foundationProducts.torta_queso, afternoonSnack: foundationProducts.pan_maiz_30 } },
      tuesday: { name: "Martes", meals: { breakfast: foundationProducts.pan_rollo_50, morningSnack: null, afternoonSnack: null } },
      wednesday: { name: "Miércoles", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: foundationProducts.pan_hojaldrado_30, afternoonSnack: foundationProducts.mogolla_30 } },
      thursday: { name: "Jueves", meals: { breakfast: foundationProducts.mogolla_50, morningSnack: foundationProducts.mantecada, afternoonSnack: foundationProducts.torta_queso } },
      friday: { name: "Viernes", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: foundationProducts.croissant_30, afternoonSnack: foundationProducts.galleta_avena } },
      saturday: { name: "Sábado", meals: { breakfast: foundationProducts.pan_maiz_50, morningSnack: foundationProducts.pan_hojaldrado_30, afternoonSnack: null } },
      sunday: { name: "Domingo", meals: { breakfast: foundationProducts.pan_blando_50, morningSnack: null, afternoonSnack: foundationProducts.galleta } },
    },
  },
] as const;
