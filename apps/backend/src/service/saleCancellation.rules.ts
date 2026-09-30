export const requireCancellationReason = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Cancellation reason is required");
  }
  return value.trim();
};
