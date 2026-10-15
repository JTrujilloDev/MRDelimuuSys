const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const CYCLE_REFERENCE_UTC = Date.UTC(2026, 9, 14);

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export const foundationMenuWeekFor = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error("La fecha de la minuta debe usar el formato YYYY-MM-DD");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dateUtc = Date.UTC(year, month - 1, day);
  const weeksFromReference = Math.floor((dateUtc - CYCLE_REFERENCE_UTC) / WEEK_IN_MS);

  return positiveModulo(weeksFromReference, 3) + 1;
};
