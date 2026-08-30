import { expect, test } from "@playwright/test";

async function mapScreenPoint(page, coordinates) {
  return page.evaluate((lngLat) => {
    const map = window.__CPBR_ATLAS_MAP__;
    const point = map.project(lngLat);
    const bounds = map.getCanvas().getBoundingClientRect();
    return { x: bounds.left + point.x, y: bounds.top + point.y };
  }, coordinates);
}

async function waitForAtlasMap(page) {
  await page.waitForFunction(() => {
    const map = window.__CPBR_ATLAS_MAP__;
    return map?.isStyleLoaded() &&
      !map.isMoving() &&
      map.getLayer("maritime-country-hit-area");
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAtlasMap(page);
});

test("EEZ hover drives cursor, overlay, land highlight and tooltip together", async ({ page }) => {
  const canvas = page.getByRole("region", { name: "Map" });
  await page.evaluate(() => {
    window.__CPBR_ATLAS_MAP__.jumpTo({ center: [-32.42, -3.85], zoom: 5 });
  });
  await page.waitForFunction(() => !window.__CPBR_ATLAS_MAP__.isMoving());
  const fernandoDeNoronha = await mapScreenPoint(page, [-32.7, -3.85]);

  await page.mouse.move(fernandoDeNoronha.x, fernandoDeNoronha.y, { steps: 6 });

  await expect.poll(() => canvas.evaluate((element) =>
    getComputedStyle(element).cursor)).toBe("pointer");
  await expect(page.getByRole("tooltip").filter({ hasText: "Brazil" }))
    .toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    JSON.stringify(
      window.__CPBR_ATLAS_MAP__.getFilter("country-marine-hover-fill"),
    ))).toContain("BR");
  await expect.poll(() => page.evaluate(() =>
    JSON.stringify(
      window.__CPBR_ATLAS_MAP__.getFilter("maritime-country-hover"),
    ))).toContain("br-pe");

  const openAtlantic = await mapScreenPoint(page, [-31, -3.85]);
  await page.mouse.move(openAtlantic.x, openAtlantic.y);

  await expect.poll(() => canvas.evaluate((element) =>
    getComputedStyle(element).cursor)).toBe("grab");
  await expect(page.getByRole("tooltip").filter({ hasText: "Brazil" }))
    .toBeHidden();
  await expect.poll(() => page.evaluate(() =>
    JSON.stringify(
      window.__CPBR_ATLAS_MAP__.getFilter("country-marine-hover-fill"),
    ))).not.toContain("BR");
});

test("regular land hover stays stable while crossing the same country", async ({ page }) => {
  const canvas = page.getByRole("region", { name: "Map" });
  const firstPoint = await mapScreenPoint(page, [-53, -11]);
  await page.mouse.move(firstPoint.x, firstPoint.y);

  const brazilTooltip = page.getByRole("tooltip").filter({ hasText: "Brazil" });
  await expect(brazilTooltip).toBeVisible();
  await page.evaluate(() => {
    const tooltip = document.querySelector('[role="tooltip"]');
    window.__CPBR_TOOLTIP_WAS_HIDDEN__ = false;
    new MutationObserver(() => {
      if (tooltip?.getAttribute("data-visible") !== "true") {
        window.__CPBR_TOOLTIP_WAS_HIDDEN__ = true;
      }
    }).observe(tooltip, { attributes: true, attributeFilter: ["data-visible"] });
  });

  for (const coordinates of [
    [-52.8, -11],
    [-52.6, -10.9],
    [-52.4, -10.8],
    [-52.2, -10.7],
  ]) {
    const point = await mapScreenPoint(page, coordinates);
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }

  await expect(brazilTooltip).toBeVisible();
  await expect.poll(() => canvas.evaluate((element) =>
    getComputedStyle(element).cursor)).toBe("pointer");
  expect(await page.evaluate(() => window.__CPBR_TOOLTIP_WAS_HIDDEN__)).toBe(false);
});

test("All EEZ mode keeps up with rapid pointer movement", async ({ page }) => {
  await page.evaluate(() => {
    const atlasState = JSON.parse(
      window.localStorage.getItem("cpbr-atlas:state"),
    );
    atlasState.preferences.eezDisplayMode = "all";
    window.localStorage.setItem("cpbr-atlas:state", JSON.stringify(atlasState));
  });
  await page.reload();
  await waitForAtlasMap(page);
  await page.evaluate(() => {
    window.__CPBR_ATLAS_MAP__.jumpTo({ center: [-32.42, -3.85], zoom: 5 });
  });
  await page.waitForFunction(() => !window.__CPBR_ATLAS_MAP__.isMoving());

  const maritimePoint = await mapScreenPoint(page, [-32.7, -3.85]);
  const emptyPoint = await mapScreenPoint(page, [-31, -3.85]);
  for (let index = 0; index < 30; index += 1) {
    const point = index % 2 === 0 ? maritimePoint : emptyPoint;
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.move(maritimePoint.x, maritimePoint.y);

  await expect(page.getByRole("tooltip").filter({ hasText: "Brazil" }))
    .toBeVisible({ timeout: 1_000 });
  await expect.poll(() => page.evaluate(() =>
    JSON.stringify(
      window.__CPBR_ATLAS_MAP__.getFilter("maritime-country-hover"),
    )), { timeout: 1_000 }).toContain("br-pe");
});
