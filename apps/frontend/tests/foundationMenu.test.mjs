import assert from "node:assert/strict";
import { test } from "node:test";
import { foundationMenu } from "../src/shared/constants/fundationMenu.ts";
import { foundationProducts } from "../src/shared/constants/fundationProducts.ts";
import { foundationMenuWeekFor } from "../src/shared/constants/fundationSchedule.ts";

test("Thursday and Friday after October 14, 2026 use week one", () => {
  assert.equal(foundationMenuWeekFor("2026-10-15"), 1);
  assert.equal(foundationMenuWeekFor("2026-10-16"), 1);
  assert.equal(foundationMenuWeekFor("2026-10-19"), 2);
  assert.equal(foundationMenuWeekFor("2026-10-26"), 3);
  assert.equal(foundationMenuWeekFor("2026-11-02"), 1);
});

test("week one Thursday and Friday match the new minute", () => {
  const weekOne = foundationMenu.find(({ week }) => week === 1);
  assert.deepEqual(weekOne.days.thursday.meals, {
    breakfast: foundationProducts.pan_blando_50,
    morningSnack: null,
    afternoonSnack: foundationProducts.pan_rollo_30,
  });
  assert.deepEqual(weekOne.days.friday.meals, {
    breakfast: foundationProducts.pan_rollo_50,
    morningSnack: foundationProducts.galleta_avena,
    afternoonSnack: null,
  });
});

test("bread portions follow breakfast and snack weights", () => {
  for (const week of foundationMenu) {
    for (const day of Object.values(week.days)) {
      for (const [meal, product] of Object.entries(day.meals)) {
        if (!product) continue;
        const isBread = /pan|mogolla|croissant/i.test(product.name);
        if (!isBread) continue;
        assert.equal(product.portionWeight, meal === "breakfast" ? 50 : 30, `${week.week} ${day.name} ${meal} ${product.name}`);
      }
    }
  }
});
