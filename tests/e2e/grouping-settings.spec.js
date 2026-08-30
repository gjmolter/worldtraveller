import { expect, test } from "@playwright/test";

async function waitForAtlasMap(page) {
  await page.waitForFunction(() => {
    const map = window.__CPBR_ATLAS_MAP__;
    return map?.isStyleLoaded() && !map.isMoving();
  });
}

async function openSettings(page) {
  await page.getByRole("button", { name: "Map settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
}

async function closeSettings(page) {
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAtlasMap(page);
});

test("a selected territory survives switching into and out of sovereign grouping", async ({ page }) => {
  const search = page.getByRole("combobox", { name: "Add place" });
  await search.fill("Guam");
  await page.getByRole("option", { name: "Guam", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Guam" })).toBeVisible();

  await openSettings(page);
  await page.getByRole("radio", { name: /Sovereign states/ }).click();
  await expect(page.getByRole("button", { name: "Remove United States group" }))
    .toBeAttached();
  await closeSettings(page);

  await search.fill("Guam");
  await expect(page.getByText("No results found")).toBeVisible();
  await search.press("Escape");

  await openSettings(page);
  await page.getByRole("radio", { name: /Countries & territories/ }).click();
  await expect(page.getByRole("button", { name: "Remove Guam" })).toBeAttached();
});

test("style and map settings persist across a reload", async ({ page }) => {
  await openSettings(page);
  await page.getByRole("radio", { name: "All EEZs" }).click();
  await page.getByRole("radio", { name: /Places Give every place/ }).click();
  await page.getByRole("radio", { name: "Statistics: Lived only" }).click();
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("radio", { name: "Lavender" }).click();
  await page.getByRole("radio", { name: /Dark Low-light map/ }).click();
  await page.getByRole("radio", { name: "Reduced" }).click();
  await page.getByRole("slider", { name: "Map hover opacity percentage" })
    .fill("65");

  await page.reload();
  await waitForAtlasMap(page);
  await openSettings(page);
  await expect(page.getByRole("radio", { name: "All EEZs" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Places Give every place/ }))
    .toBeChecked();
  await expect(page.getByRole("radio", { name: "Statistics: Lived only" }))
    .toBeChecked();
  await page.getByRole("tab", { name: "Style" }).click();
  await expect(page.getByRole("radio", { name: "Lavender" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Dark Low-light map/ }))
    .toBeChecked();
  await expect(page.getByRole("radio", { name: "Reduced" })).toBeChecked();
  await expect(page.getByRole("slider", { name: "Map hover opacity percentage" }))
    .toHaveValue("65");
});

test("detailed travel selections persist across a reload", async ({ page }) => {
  await openSettings(page);
  await page.getByRole("radio", { name: /Detailed places/ }).click();
  await closeSettings(page);
  await page.getByRole("radio", { name: "Lived" }).click();

  const search = page.getByRole("combobox", { name: "Add place" });
  await search.fill("São Paulo");
  await page.getByRole("option", { name: /São Paulo/ }).click();
  await expect(page.getByRole("button", { name: /Remove São Paulo — Lived/ }))
    .toBeVisible();

  await page.reload();
  await waitForAtlasMap(page);
  await expect(page.getByRole("button", { name: /Remove São Paulo — Lived/ }))
    .toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("cpbr-atlas:state")).travel))
    .toMatchObject({
      version: 2,
      countries: [],
      subdivisions: ["br-sp"],
      subdivisionTypes: { "br-sp": "lived" },
    });
});

test("legacy travel data and preferences migrate without data loss", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.removeItem("cpbr-atlas:state");
    window.localStorage.setItem("cpbr-atlas:travel-state", JSON.stringify({
      version: 2,
      countries: ["pt"],
      subdivisions: [],
      countryTypes: { pt: "lived" },
      subdivisionTypes: {},
    }));
    window.localStorage.setItem("cpbr-atlas:place-grouping", "sovereign");
    window.localStorage.setItem("cpbr-atlas:map-theme", "dark");
    window.localStorage.setItem("cpbr-atlas:statistics-visit-type", "lived");
  });

  await page.reload();
  await waitForAtlasMap(page);
  await expect(page.getByRole("button", {
    name: /Remove Portugal group — Lived/,
  })).toBeVisible();
  await openSettings(page);
  await expect(page.getByRole("radio", { name: /Sovereign states/ }))
    .toBeChecked();
  await expect(page.getByRole("radio", { name: "Statistics: Lived only" }))
    .toBeChecked();
  await page.getByRole("tab", { name: "Style" }).click();
  await expect(page.getByRole("radio", { name: /Dark Low-light map/ }))
    .toBeChecked();

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("cpbr-atlas:state"));
    return {
      countryTypes: state.travel.countryTypes,
      placeGrouping: state.preferences.placeGrouping,
      mapTheme: state.preferences.mapTheme,
      legacyTravelStillPresent: Boolean(
        window.localStorage.getItem("cpbr-atlas:travel-state"),
      ),
    };
  })).toEqual({
    countryTypes: { pt: "lived" },
    placeGrouping: "sovereign",
    mapTheme: "dark",
    legacyTravelStillPresent: true,
  });
});
