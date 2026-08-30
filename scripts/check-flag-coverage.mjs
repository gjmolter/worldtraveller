import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import countries from "world-countries";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const customPlaceData = JSON.parse(
  await readFile(resolve(root, "data/custom-places.json"), "utf8"),
);
const remoteFlagPlaceIds = new Set(["es-ce", "es-ml"]);
const flagDirectory = resolve(root, "node_modules/flag-icons/flags/4x3");

const places = [
  ...countries
    .filter((country) => country.cca2 && country.cca3)
    .map((country) => ({
      id: country.cca2.toLowerCase(),
      flagCode: country.cca2.toLowerCase(),
    })),
  ...customPlaceData.places.map(({ id, flagCode }) => ({ id, flagCode })),
];

const missingFlagCodes = places.filter((place) => !place.flagCode);
const missingAssets = [];

for (const place of places) {
  if (remoteFlagPlaceIds.has(place.id)) continue;

  try {
    await access(resolve(flagDirectory, `${place.flagCode}.svg`), constants.R_OK);
  } catch {
    missingAssets.push(place);
  }
}

if (missingFlagCodes.length || missingAssets.length) {
  console.error("Flag coverage audit failed.");
  if (missingFlagCodes.length) console.error("Missing codes:", missingFlagCodes);
  if (missingAssets.length) console.error("Missing SVGs:", missingAssets);
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${places.length} places: ${places.length - remoteFlagPlaceIds.size} local SVG flags and ${remoteFlagPlaceIds.size} reviewed municipal SVGs.`,
  );
}
