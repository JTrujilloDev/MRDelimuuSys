export const calculateCashCount = (counts: Record<number, string>, denominations: readonly number[]) => {
  let total = 0;
  let valid = true;
  for (const denomination of denominations) {
    const raw = counts[denomination]?.trim() ?? "";
    const count = raw === "" ? 0 : Number(raw);
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(count * denomination)) {
      valid = false;
      continue;
    }
    total += count * denomination;
  }
  return { total, valid: valid && Number.isSafeInteger(total) };
};
