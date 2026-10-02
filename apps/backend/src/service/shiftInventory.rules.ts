export const countPhase = (value: unknown): "OPENING" | "CLOSING" => {
  if (value !== "OPENING" && value !== "CLOSING") throw new Error("Tipo de conteo inválido.");
  return value;
};

export const validateCount = (quantity: unknown, expected: number, reason: unknown) => {
  if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647) {
    throw new Error("Ingresa una cantidad entera válida; un campo vacío no significa cero.");
  }
  const justification = typeof reason === "string" ? reason.trim() : "";
  if (justification.length > 2000) throw new Error("La justificación es demasiado larga.");
  const difference = quantity - expected;
  if (difference && !justification) throw new Error("Justifica la diferencia de inventario.");
  return { countedQuantity: quantity, difference, justification: justification || null };
};

export const assertSnapshot = (expected: unknown, revision: unknown, stock: number, currentRevision: number) => {
  if (expected !== stock || revision !== currentRevision) {
    throw new Error("El inventario cambió mientras contabas. Actualiza y vuelve a verificar este producto.");
  }
};
