export const requireCatalogPrice = (value: unknown, label: string) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Valid ${label} is required`);
  }
  return price;
};

export const normalizePosCode = (value: unknown) =>
  String(value ?? "").trim().toUpperCase();

export const requirePosCode = (value: unknown) => {
  const code = normalizePosCode(value);
  if (!code) return null;
  if (!/^[A-Z0-9-]{1,20}$/.test(code)) {
    throw new Error("El código POS debe tener entre 1 y 20 letras, números o guiones");
  }
  return code;
};
