/**
 * Funciones suspendidas temporalmente. Se conservan sus pantallas y lógica
 * para que puedan reactivarse desde un único lugar.
 */
export const operationFeatures = Object.freeze({
  customers: false,
  electronicBilling: false,
  inventoryTransfers: false,
});

export type InventoryCountPolicy = "STRICT" | "FLEXIBLE";

export const inventoryCountPolicyForGroup = (
  code: string | null | undefined,
): InventoryCountPolicy => code?.trim().toUpperCase() === "DELIMUU"
  ? "FLEXIBLE"
  : "STRICT";

