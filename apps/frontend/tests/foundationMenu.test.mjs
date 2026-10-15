import assert from "node:assert/strict";
import { test } from "node:test";
import { foundationMenu } from "../src/shared/constants/fundationMenu.ts";
import {
  distributeFoundationUnits,
  foundationLabelContent,
  foundationProducts,
} from "../src/shared/constants/fundationProducts.ts";
import { foundationMenuWeekFor } from "../src/shared/constants/fundationSchedule.ts";

test("the three-week cycle starts on Monday, October 12, 2026", () => {
  assert.equal(foundationMenuWeekFor("2026-10-12"), 1);
  assert.equal(foundationMenuWeekFor("2026-10-14"), 1);
  assert.equal(foundationMenuWeekFor("2026-10-15"), 1);
  assert.equal(foundationMenuWeekFor("2026-10-16"), 1);
  assert.equal(foundationMenuWeekFor("2026-10-18"), 1);
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

test("units are distributed across all labels without changing the production total", () => {
  for (const product of Object.values(foundationProducts)) {
    const isCookie = /galleta/i.test(product.name);
    assert.equal(product.totalUnits, isCookie ? 220 : 110, product.name);
    const distribution = distributeFoundationUnits(product.totalUnits, product.labelAmount);
    assert.equal(distribution.length, product.labelAmount, product.name);
    assert.equal(distribution.reduce((total, units) => total + units, 0), product.totalUnits, product.name);
    assert.ok(Math.max(...distribution) - Math.min(...distribution) <= 1, product.name);
  }
});

test("uneven totals produce labels with the real content of each bag", () => {
  assert.deepEqual(distributeFoundationUnits(110, 3), [37, 37, 36]);
  assert.deepEqual(distributeFoundationUnits(110, 4), [28, 28, 27, 27]);
  assert.deepEqual(distributeFoundationUnits(220, 2), [110, 110]);
  assert.equal(foundationLabelContent(foundationProducts.pan_rollo_30, 37), "1.110 g (37 und. X 30 g)");
  assert.equal(foundationLabelContent(foundationProducts.pan_rollo_50, 28), "1.400 g (28 und. X 50 g)");
  assert.equal(foundationLabelContent(foundationProducts.galleta, 110), "2.200 g (110 und. X 20 g)");
});

test("cookies are packed in two equal bags of 110 units", () => {
  for (const product of [foundationProducts.galleta, foundationProducts.galleta_avena]) {
    assert.equal(product.labelAmount, 2);
    assert.deepEqual(distributeFoundationUnits(product.totalUnits, product.labelAmount), [110, 110]);
  }
});

test("bread labels follow the portion weight", () => {
  for (const product of Object.values(foundationProducts)) {
    const isBread = /pan|mogolla|croissant/i.test(product.name);
    if (!isBread) continue;
    assert.equal(product.labelAmount, product.portionWeight === 50 ? 4 : 3, product.name);
  }
});
