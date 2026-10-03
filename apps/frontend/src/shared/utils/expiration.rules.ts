export const EXPIRATION_WARNING_DAYS = 1;

const colombianDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
});

// Expiration is a calendar date, not a rolling 24-hour interval.
export const getDaysUntilExpiration = (value: string | null, now = new Date()) => {
  if (!value) return null;
  const expiration = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(expiration)) return null;
  const parts = colombianDate.formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)!.value);
  const today = Date.UTC(part("year"), part("month") - 1, part("day"));
  return Math.round((expiration - today) / 86_400_000);
};

export const needsExpirationWarning = (days: number | null) =>
  days !== null && days <= EXPIRATION_WARNING_DAYS;
