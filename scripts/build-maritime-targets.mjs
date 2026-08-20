import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import simplify from "@turf/simplify";
import countries from "world-countries";

const inputPath = resolve(
  process.argv[2] || "/tmp/worldtraveller-eez-small.json",
);
const outputPath = resolve(
  process.argv[3] || "public/data/maritime-country-targets.geojson",
);

const alpha2ByAlpha3 = Object.fromEntries(
  countries.map((country) => [country.cca3, country.cca2.toLowerCase()]),
);

const source = JSON.parse(await readFile(inputPath, "utf8"));
const features = source.features.flatMap((feature, index) => {
  const territories = [1, 2, 3]
    .map((position) => {
      const alpha3 = feature.properties[`iso_ter${position}`];
      const code = alpha2ByAlpha3[alpha3];
      if (!code) return null;
      return {
        code,
        name: feature.properties[`territory${position}`],
      };
    })
    .filter(Boolean)
    .filter(
      (territory, territoryIndex, all) =>
        all.findIndex(({ code }) => code === territory.code) === territoryIndex,
    );

  if (!territories.length) return [];

  const simplified = simplify(feature, {
    tolerance: 0.025,
    highQuality: false,
    mutate: false,
  });

  return {
    type: "Feature",
    id: `marine-${index}`,
    properties: {
      code1: territories[0]?.code || "",
      name1: territories[0]?.name || "",
      code2: territories[1]?.code || "",
      name2: territories[1]?.name || "",
      code3: territories[2]?.code || "",
      name3: territories[2]?.name || "",
    },
    geometry: simplified.geometry,
  };
});

const output = {
  type: "FeatureCollection",
  attribution:
    "Flanders Marine Institute (2023), Maritime Boundaries and Exclusive Economic Zones (200NM), version 12, CC BY 4.0, https://doi.org/10.14284/632",
  features,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(output));

console.log(`Wrote ${features.length} maritime interaction features to ${outputPath}`);
