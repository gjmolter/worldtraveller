import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "public/data/admin1-subdivisions.geojson");
const outputPath = resolve(root, "data/subdivision-centroids.json");

function ringCentroid(ring) {
  let twiceArea = 0;
  let longitudeTotal = 0;
  let latitudeTotal = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude, latitude] = ring[index];
    const [nextLongitude, nextLatitude] = ring[index + 1];
    const cross = longitude * nextLatitude - nextLongitude * latitude;
    twiceArea += cross;
    longitudeTotal += (longitude + nextLongitude) * cross;
    latitudeTotal += (latitude + nextLatitude) * cross;
  }

  if (Math.abs(twiceArea) < 1e-12) {
    const points = ring.slice(0, -1);
    return {
      area: 0,
      coordinates: [
        points.reduce((total, [longitude]) => total + longitude, 0) /
          points.length,
        points.reduce((total, [, latitude]) => total + latitude, 0) /
          points.length,
      ],
    };
  }

  return {
    area: Math.abs(twiceArea / 2),
    coordinates: [
      longitudeTotal / (3 * twiceArea),
      latitudeTotal / (3 * twiceArea),
    ],
  };
}

function geometryCentroid(geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) => ringCentroid(polygon[0]))
    .sort((left, right) => right.area - left.area)[0]?.coordinates;
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const centroids = Object.fromEntries(
  source.features
    .map((feature) => [
      feature.properties.app_id,
      geometryCentroid(feature.geometry)?.map((coordinate) =>
        Number(coordinate.toFixed(6)),
      ),
    ])
    .filter(([, coordinates]) => coordinates),
);

await writeFile(
  outputPath,
  `${JSON.stringify({ reviewedOn: "2026-08-24", centroids }, null, 2)}\n`,
);
console.log(`Wrote ${Object.keys(centroids).length} subdivision centroids`);
