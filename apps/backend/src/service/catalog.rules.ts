export const requireCatalogPrice = (value: unknown, label: string) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Valid ${label} is required`);
  }
  return price;
};
