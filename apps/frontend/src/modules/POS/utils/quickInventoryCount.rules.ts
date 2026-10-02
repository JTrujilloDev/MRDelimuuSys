/** Empty is pending, never an implicit zero. Match the backend's integer limit. */
export const parseCountQuantity = (value: string): number | null =>
  /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647
    ? Number(value)
    : null;
