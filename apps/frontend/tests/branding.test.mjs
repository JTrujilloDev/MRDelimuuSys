import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { brands, resolveBrand, systemBrand } from "../src/app/branding/brand.ts";

test("brand comes from the business group, not a point-specific ID", () => {
  assert.equal(resolveBrand("VELENO"), brands.veleno);
  assert.equal(resolveBrand("Veleño"), brands.veleno);
  assert.equal(resolveBrand(" veleno "), brands.veleno);
  assert.equal(resolveBrand("DELIMUU"), brands.delimuu);
  assert.equal(resolveBrand(undefined), brands.delimuu);
  assert.equal(resolveBrand("ANOTHER_GROUP"), brands.delimuu);
  assert.equal(resolveBrand("VELENO_POINT_1"), brands.delimuu);
});

const luminance = (hex) => {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (first, second) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

test("light and dark Veleño palettes retain readable text and button labels", () => {
  const css = readFileSync(new URL("../src/styles/veleno.css", import.meta.url), "utf8");
  const palettes = [...css.matchAll(/\{([^}]+)\}/g)].map((match) =>
    Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map((token) => [token[1], token[2]])),
  ).filter((palette) => palette.accent);
  assert.equal(palettes.length, 2);
  for (const palette of palettes) {
    for (const [foreground, background] of [
      ["foreground", "background"], ["field-foreground", "field-background"],
      ["accent-foreground", "accent"], ["muted", "surface-secondary"],
      ["pos-order-fg", "pos-order-bg"],
    ]) {
      assert.ok(contrast(palette[foreground], palette[background]) >= 4.5, `${foreground} / ${background}`);
    }
  }
});

test("logo assets exist for both groups", () => {
  for (const brand of [...Object.values(brands), systemBrand]) {
    const image = readFileSync(new URL(`../public${brand.logo}`, import.meta.url));
    assert.ok(image.length > 0);
  }
});

test("Delisys remains separate from the point brands and has readable palettes", () => {
  assert.equal(systemBrand.name, "Delisys");
  assert.notEqual(systemBrand.logo, brands.delimuu.logo);
  assert.notEqual(systemBrand.logo, brands.veleno.logo);
  const css = readFileSync(new URL("../src/styles/delisys.css", import.meta.url), "utf8");
  const palettes = [...css.matchAll(/\{([^}]+)\}/g)].map((match) =>
    Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map((token) => [token[1], token[2]])),
  ).filter((palette) => palette.accent);
  assert.equal(palettes.length, 2);
  for (const palette of palettes) {
    for (const [foreground, background] of [["foreground", "background"], ["field-foreground", "field-background"], ["accent-foreground", "accent"], ["muted", "surface-secondary"]]) {
      assert.ok(contrast(palette[foreground], palette[background]) >= 4.5, `${foreground} / ${background}`);
    }
  }
});
