import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCashCount } from "../src/modules/POS/utils/cashCount.rules.ts";
import { newRequestKey } from "../src/shared/utils/requestKey.ts";

test("cuenta exactamente billetes y monedas", () => {
  assert.deepEqual(calculateCashCount({ 100000: "1", 50000: "1", 10000: "1", 2000: "4", 500: "1" }, [100000, 50000, 10000, 2000, 500]), { total: 168500, valid: true });
  assert.deepEqual(calculateCashCount({}, [100000, 500]), { total: 0, valid: true });
});
test("no trunca cantidades inválidas ni permite conteos negativos", () => {
  for (const value of ["-1", "1.5", "abc", "Infinity", "9007199254740992"])
    assert.equal(calculateCashCount({ 500: value }, [500]).valid, false);
});

test("identificación de reintentos funciona sin randomUUID de HTTPS", () => {
  const first = newRequestKey();
  assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.notEqual(first, newRequestKey());
});
