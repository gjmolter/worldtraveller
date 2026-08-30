import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseSubdivisions = JSON.parse(
  await readFile(resolve(root, "data/subdivisions.json"), "utf8"),
).places;
const expandedSubdivisions = JSON.parse(
  await readFile(resolve(root, "data/subdivision-expansion.json"), "utf8"),
).places;
const southAmericaSubdivisions = JSON.parse(
  await readFile(resolve(root, "data/subdivision-south-america.json"), "utf8"),
).places;
const subdivisions = [
  ...baseSubdivisions,
  ...expandedSubdivisions,
  ...southAmericaSubdivisions,
];
const flagAssets = JSON.parse(
  await readFile(resolve(root, "data/subdivision-flag-assets.json"), "utf8"),
).assets;
const attribution = JSON.parse(
  await readFile(
    resolve(root, "public/data/subdivision-flag-attribution.json"),
    "utf8",
  ),
).assets;
const attributionIds = new Set(attribution.map(({ id }) => id));
const problems = [];

for (const subdivision of subdivisions) {
  const asset = flagAssets[subdivision.id];
  if (!asset?.path) {
    problems.push(`${subdivision.id}: missing runtime asset`);
    continue;
  }
  if (!attributionIds.has(subdivision.id)) {
    problems.push(`${subdivision.id}: missing attribution`);
  }

  try {
    await access(resolve(root, "public", asset.path.slice(1)), constants.R_OK);
  } catch {
    problems.push(`${subdivision.id}: missing local image ${asset.path}`);
  }
}

const unexpectedIds = Object.keys(flagAssets).filter(
  (id) => !subdivisions.some((subdivision) => subdivision.id === id),
);
for (const id of unexpectedIds) problems.push(`${id}: asset has no subdivision`);

if (problems.length) {
  console.error("Subdivision flag coverage audit failed:\n" + problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${subdivisions.length} local subdivision flags and ${attribution.length} attribution records.`,
  );
}
