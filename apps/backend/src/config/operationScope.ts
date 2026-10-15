/**
 * Alcance temporal de la operación.
 *
 * Las funciones suspendidas y los datos de otros grupos permanecen en el
 * código y en la base de datos para poder reactivarlos sin una migración.
 */
export const ACTIVE_STORE_GROUP_CODE = "DELIMUU";

export const operationFeatures = Object.freeze({
  customers: false,
  electronicBilling: false,
  inventoryTransfers: false,
});

export type InventoryCountPolicy = "STRICT" | "FLEXIBLE";

export const inventoryCountPolicyForGroup = (
  code: string | null | undefined,
): InventoryCountPolicy => isActiveStoreGroup(code) ? "FLEXIBLE" : "STRICT";

export const isActiveStoreGroup = (code: string | null | undefined) =>
  code?.trim().toUpperCase() === ACTIVE_STORE_GROUP_CODE;

