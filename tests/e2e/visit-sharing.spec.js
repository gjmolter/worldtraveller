import { expect, test } from "@playwright/test";

async function waitForAtlasMap(page) {
  await page.waitForFunction(() => {
    const map = window.__CPBR_ATLAS_MAP__;
    return map?.isStyleLoaded() && !map.isMoving();
  });
}

async function selectPlace(page, name) {
  const search = page.getByRole("combobox", { name: "Add place" });
  await search.fill(name);
  await page.getByRole("option", { name: new RegExp(name) }).waitFor();
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute(
    "aria-activedescendant",
    /country-option-/,
  );
  await search.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAtlasMap(page);
});

test("the active visit type classifies and reclassifies a searched place", async ({ page }) => {
  const selectedPatterns = [];
  for (const name of ["Passed through", "Visited", "Lived"]) {
    const control = page.getByRole("radio", { name });
    await control.click();
    selectedPatterns.push(await control.evaluate((element) =>
      getComputedStyle(element).backgroundImage));
  }
  expect(new Set(selectedPatterns).size).toBe(3);

  await page.getByRole("radio", { name: "Lived" }).click();
  await selectPlace(page, "Guam");
  await expect(page.getByRole("button", { name: /Remove Guam — Lived/ }))
    .toBeVisible();

  await page.getByRole("radio", { name: "Passed through" }).click();
  await selectPlace(page, "Guam");
  await expect(page.getByRole("button", {
    name: /Remove Guam — Passed through/,
  })).toBeVisible();

  await page.reload();
  await waitForAtlasMap(page);
  await expect(page.getByRole("button", {
    name: /Remove Guam — Passed through/,
  })).toBeVisible();
});

test("a shared URL restores its map without overwriting local travel data", async ({ page }) => {
  await page.getByRole("radio", { name: "Lived" }).click();
  await selectPlace(page, "Brazil");
  await page.getByRole("button", { name: "Share your travel map" }).click();
  const shareUrl = await page.getByRole("textbox", {
    name: "Shareable map link",
  }).inputValue();
  expect(shareUrl).toContain("?map=");

  await page.evaluate(() => {
    const atlasState = JSON.parse(
      window.localStorage.getItem("cpbr-atlas:state"),
    );
    atlasState.travel = {
      version: 2,
      countries: ["pt"],
      subdivisions: [],
      countryTypes: { pt: "visited" },
      subdivisionTypes: {},
    };
    window.localStorage.setItem("cpbr-atlas:state", JSON.stringify(atlasState));
  });
  await page.goto(shareUrl);
  await waitForAtlasMap(page);

  await expect(page.getByRole("button", { name: /Remove Brazil — Lived/ }))
    .toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("cpbr-atlas:state")).travel))
    .toMatchObject({ countries: ["pt"] });
});
