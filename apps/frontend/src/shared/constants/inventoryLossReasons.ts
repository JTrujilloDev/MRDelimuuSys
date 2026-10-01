export const inventoryLossReasons = [
  { value: "EXPIRATION", label: "Vencimiento" },
  { value: "DAMAGED", label: "Producto dañado" },
  { value: "PREPARATION_ERROR", label: "Error de preparación" },
  { value: "QUALITY_CONTROL", label: "Control de calidad" },
  { value: "OTHER", label: "Otro" },
] as const;

export type InventoryLossReason = (typeof inventoryLossReasons)[number]["value"];

export const getInventoryLossReasonLabel = (value?: string | null) =>
  inventoryLossReasons.find((reason) => reason.value === value)?.label ?? null;
