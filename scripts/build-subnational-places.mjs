import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import simplify from "@turf/simplify";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "public/data/subnational-places.geojson");
const alandPath = resolve(root, "node_modules/world-countries/data/ala.geo.json");
const ukCountriesUrl =
  "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Countries_December_2023_Boundaries_UK_BSC/FeatureServer/0/query";

const ukPlaceIds = {
  England: "eng",
  "Northern Ireland": "nir",
  Scotland: "sco",
  Wales: "wal",
};

const query = new URLSearchParams({
  where: "1=1",
  outFields: "CTRY23CD,CTRY23NM,Shape__Area",
  outSR: "4326",
  returnGeometry: "true",
  f: "geojson",
});
const response = await fetch(`${ukCountriesUrl}?${query}`);
if (!response.ok) {
  throw new Error(`ONS boundary request failed: HTTP ${response.status}`);
}

const ukCountries = await response.json();
const aland = JSON.parse(await readFile(alandPath, "utf8"));
const ukFeatures = ukCountries.features.map((feature) => {
  const name = feature.properties.CTRY23NM;
  const appId = ukPlaceIds[name];
  if (!appId) throw new Error(`Unexpected UK country in ONS data: ${name}`);

  const simplified = simplify(feature, {
    tolerance: 0.012,
    highQuality: true,
    mutate: false,
  });
  return {
    type: "Feature",
    id: appId,
    properties: {
      app_id: appId,
      parent_id: "gb",
      name,
      source_code: feature.properties.CTRY23CD,
    },
    geometry: simplified.geometry,
  };
});

const alandFeature = simplify(aland.features[0], {
  tolerance: 0.006,
  highQuality: true,
  mutate: false,
});
const features = [
  ...ukFeatures,
  {
    type: "Feature",
    id: "ax",
    properties: {
      app_id: "ax",
      parent_id: "fi",
      name: "Åland Islands",
    },
    geometry: alandFeature.geometry,
  },
];

await writeFile(
  outputPath,
  `${JSON.stringify({ type: "FeatureCollection", features })}\n`,
);
console.log(`Wrote ${features.length} subnational place polygons to ${outputPath}`);
