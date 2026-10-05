export const normalizePosCode = (value: string) => value.trim().toUpperCase();

export const isValidPosCode = (value: string) => {
  const normalized = normalizePosCode(value);
  return normalized === "" || /^[A-Z0-9-]{1,20}$/.test(normalized);
};

export const parseQuickQuantity = (value: string) => {
  if (!/^\d+$/.test(value.trim())) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
};
