import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import simplify from "@turf/simplify";

const DEFAULT_INPUT = "public/data/maritime-country-targets.geojson";
const DEFAULT_OUTPUT = "public/data/maritime-country-targets-overview.geojson";
const OVERVIEW_TOLERANCE = 0.12;

export async function writeMaritimeOverview(
  inputPath = resolve(DEFAULT_INPUT),
  outputPath = resolve(DEFAULT_OUTPUT),
) {
  const collection = JSON.parse(await readFile(inputPath, "utf8"));
  let fallbackCount = 0;
  let preservedCount = 0;
  const features = collection.features.map((feature) => {
    if (feature.properties?.preserveOverviewDetail) {
      preservedCount += 1;
      return feature;
    }
    try {
      return simplify(feature, {
        tolerance: OVERVIEW_TOLERANCE,
        highQuality: false,
        mutate: false,
      });
    } catch {
      fallbackCount += 1;
      return feature;
    }
  });
  const overview = {
    ...collection,
    overviewTolerance: OVERVIEW_TOLERANCE,
    features,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(overview));
  console.log(
    `Wrote ${features.length} overview maritime features to ${outputPath}` +
      (fallbackCount || preservedCount
        ? ` (${preservedCount} deliberately preserved, ${fallbackCount} retained after simplification errors)`
        : ""),
  );
}

const isDirectRun =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  await writeMaritimeOverview(
    resolve(process.argv[2] || DEFAULT_INPUT),
    resolve(process.argv[3] || DEFAULT_OUTPUT),
  );
}
