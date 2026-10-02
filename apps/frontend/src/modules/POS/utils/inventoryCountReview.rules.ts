type ReviewItem = { productVariantId: number; difference: number; resolution: string | null };

/** Prioritize unresolved differences without changing the saved count or order within a group. */
export function orderInventoryCountReview<T extends { productVariantId: number }>(products: readonly T[], items: readonly ReviewItem[]): T[] {
  const priorities = new Map(items.map(item => [item.productVariantId, item.difference === 0 ? 2 : item.resolution ? 1 : 0]));
  return [...products].sort((left, right) =>
    (priorities.get(left.productVariantId) ?? 2) - (priorities.get(right.productVariantId) ?? 2));
}
