import assert from "node:assert/strict";
import { test } from "node:test";
import { getDaysUntilExpiration, needsExpirationWarning } from "../src/shared/utils/expiration.rules.ts";

test("advierte solo mañana, hoy y vencidos; no dos o más días antes", () => {
  const now = new Date("2026-10-02T17:00:00Z");
  for (const [date, days, warning] of [
    ["2026-10-01", -1, true], ["2026-10-02", 0, true],
    ["2026-10-03", 1, true], ["2026-10-04", 2, false], ["2026-10-09", 7, false],
  ]) {
    const result = getDaysUntilExpiration(date, now);
    assert.equal(result, days);
    assert.equal(needsExpirationWarning(result), warning);
  }
});

test("sin fecha o fecha inválida no genera advertencia", () => {
  assert.equal(getDaysUntilExpiration(null), null);
  assert.equal(getDaysUntilExpiration("invalid"), null);
  assert.equal(needsExpirationWarning(null), false);
});

test("usa el día de Colombia aunque UTC ya haya cambiado de fecha", () => {
  assert.equal(getDaysUntilExpiration("2026-10-04T00:00:00Z", new Date("2026-10-03T04:59:59Z")), 2);
  assert.equal(getDaysUntilExpiration("2026-10-04", new Date("2026-10-03T05:00:00Z")), 1);
});

test("diferencia de días funciona al cambiar mes y año", () => {
  assert.equal(getDaysUntilExpiration("2027-01-01", new Date("2026-12-31T18:00:00Z")), 1);
  assert.equal(getDaysUntilExpiration("2026-11-01", new Date("2026-10-31T18:00:00Z")), 1);
});
