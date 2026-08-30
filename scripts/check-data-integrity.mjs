import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import union from "@turf/union";
import countries from "world-countries";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

function duplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  }))];
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const [
  associations,
  customPlaces,
  baseSubdivisions,
  subdivisionExpansion,
  southAmericaSubdivisions,
  landShares,
  admin1Geometry,
  subdivisionCentroids,
  maritimeTargets,
  maritimeOverview,
] = await Promise.all([
  readJson("data/territory-associations.json"),
  readJson("data/custom-places.json"),
  readJson("data/subdivisions.json"),
  readJson("data/subdivision-expansion.json"),
  readJson("data/subdivision-south-america.json"),
  readJson("data/subdivision-land-shares.json"),
  readJson("public/data/admin1-subdivisions.geojson"),
  readJson("data/subdivision-centroids.json"),
  readJson("public/data/maritime-country-targets.geojson"),
  readJson("public/data/maritime-country-targets-overview.geojson"),
]);

const errors = [];
const knownPlaceIds = new Set([
  ...countries.map(({ cca2 }) => cca2?.toLowerCase()).filter(Boolean),
  ...customPlaces.places.map(({ id }) => id),
]);
const states = associations.groups.map(({ state }) => state);
const administeredPlaces = associations.groups.flatMap(({ places }) => places);

for (const id of duplicates(states)) {
  errors.push(`Sovereign state ${id} is declared more than once`);
}
for (const id of duplicates(administeredPlaces)) {
  errors.push(`Administered place ${id} belongs to more than one sovereign state`);
}
for (const { state, places } of associations.groups) {
  assert(knownPlaceIds.has(state), `Unknown sovereign state ${state}`, errors);
  assert(places.length > 0, `Sovereign state ${state} has an empty group`, errors);
  assert(!places.includes(state), `${state} includes itself as a child`, errors);
  for (const place of places) {
    assert(knownPlaceIds.has(place), `Unknown administered place ${place}`, errors);
  }
}

const subdivisionPlaces = [
  ...baseSubdivisions.places,
  ...subdivisionExpansion.places,
  ...southAmericaSubdivisions.places,
];
const subdivisionIds = subdivisionPlaces.map(({ id }) => id);
const geometryIds = admin1Geometry.features.map(
  ({ properties }) => properties?.app_id,
);

for (const id of duplicates(subdivisionIds)) {
  errors.push(`Subdivision ${id} is defined more than once`);
}
for (const id of duplicates(geometryIds)) {
  errors.push(`Subdivision geometry ${id} appears more than once`);
}

const subdivisionIdSet = new Set(subdivisionIds);
const geometryIdSet = new Set(geometryIds);
const maritimeTargetIdSet = new Set([...knownPlaceIds, ...subdivisionIdSet]);
for (const { id, parentId } of subdivisionPlaces) {
  assert(knownPlaceIds.has(parentId), `${id} has unknown parent ${parentId}`, errors);
  assert(geometryIdSet.has(id), `${id} has no map geometry`, errors);
  const centroid = subdivisionCentroids.centroids[id];
  assert(
    Array.isArray(centroid) &&
      centroid.length === 2 &&
      centroid.every(Number.isFinite),
    `${id} has no valid selection centroid`,
    errors,
  );
  const share = landShares.shares[id];
  assert(
    Number.isFinite(share) && share >= 0,
    `${id} has no valid land share`,
    errors,
  );
}
for (const id of geometryIdSet) {
  assert(subdivisionIdSet.has(id), `Map geometry ${id} has no definition`, errors);
}

const maritimeIds = maritimeTargets.features.map(({ id }) => id);
const maritimeOverviewIds = maritimeOverview.features.map(({ id }) => id);
for (const id of duplicates(maritimeIds)) {
  errors.push(`Maritime feature ${id} appears more than once`);
}
for (const id of duplicates(maritimeOverviewIds)) {
  errors.push(`Overview maritime feature ${id} appears more than once`);
}
const maritimeIdSet = new Set(maritimeIds);
const maritimeOverviewIdSet = new Set(maritimeOverviewIds);
for (const id of maritimeIdSet) {
  assert(
    maritimeOverviewIdSet.has(id),
    `Maritime feature ${id} is missing from the overview dataset`,
    errors,
  );
}
for (const id of maritimeOverviewIdSet) {
  assert(
    maritimeIdSet.has(id),
    `Overview maritime feature ${id} is missing from the detailed dataset`,
    errors,
  );
}

for (const feature of maritimeTargets.features) {
  const featureId = feature.id || "unknown maritime feature";
  const codes = [1, 2, 3]
    .map((position) => feature.properties?.[`code${position}`])
    .filter(Boolean);
  const aidCodes = [1, 2, 3]
    .map((position) => feature.properties?.[`aidCode${position}`])
    .filter(Boolean);

  assert(codes.length > 0, `${featureId} has no selectable target`, errors);
  assert(
    ["Polygon", "MultiPolygon"].includes(feature.geometry?.type),
    `${featureId} has unsupported geometry ${feature.geometry?.type || "none"}`,
    errors,
  );
  if (feature.properties?.selectionAidRadiusNm != null) {
    assert(
      Number.isFinite(feature.properties.selectionAidRadiusNm) &&
        feature.properties.selectionAidRadiusNm > 0,
      `${featureId} has an invalid selection-aid radius`,
      errors,
    );
  }
  for (const code of codes) {
    assert(
      maritimeTargetIdSet.has(code),
      `${featureId} targets unknown place or subdivision ${code}`,
      errors,
    );
  }
  for (const code of aidCodes) {
    assert(
      maritimeTargetIdSet.has(code),
      `${featureId} has unknown selection-aid target ${code}`,
      errors,
    );
    assert(
      codes.includes(code),
      `${featureId} selection aid ${code} is not a display target`,
      errors,
    );
  }
  assert(
    feature.properties?.selectionAid === (aidCodes.length > 0),
    `${featureId} has inconsistent selectionAid metadata`,
    errors,
  );

  if (
    feature.geometry?.type === "MultiPolygon" &&
    feature.geometry.coordinates.length > 1
  ) {
    const polygons = feature.geometry.coordinates.map((coordinates) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates },
    }));
    try {
      const combined = union({
        type: "FeatureCollection",
        features: polygons,
      });
      const componentArea = polygons.reduce(
        (total, polygon) => total + area(polygon),
        0,
      );
      const overlapArea = componentArea - area(combined);
      assert(
        overlapArea <= Math.max(componentArea * 0.001, 1_000_000),
        `${featureId} contains materially overlapping maritime polygons`,
        errors,
      );
    } catch (error) {
      errors.push(`${featureId} cannot be unioned: ${error.message}`);
    }
  }
}

const requiredRemoteSelectionAids = [
  { name: "Abrolhos Archipelago", code: "br-ba", radiusNm: 24 },
  { name: "Atol das Rocas", code: "br-rn", radiusNm: 24 },
  { name: "Fernando de Noronha", code: "br-pe", radiusNm: 24 },
  {
    name: "Saint Peter and Saint Paul Archipelago",
    code: "br-pe",
    radiusNm: 24,
  },
  { name: "Trindade", code: "br-es", radiusNm: 24 },
];
for (const { name, code, radiusNm } of requiredRemoteSelectionAids) {
  const feature = maritimeTargets.features.find((candidate) =>
    [1, 2, 3].some(
      (position) =>
        candidate.properties?.[`aidName${position}`] === name &&
        candidate.properties?.[`aidCode${position}`] === code,
    ),
  );
  assert(
    feature?.properties?.selectionAid === true,
    `${name} is missing its ${code} maritime selection aid`,
    errors,
  );
  assert(
    feature?.properties?.selectionAidRadiusNm === radiusNm,
    `${name} should use a compact ${radiusNm} NM selection aid`,
    errors,
  );
}

const sharesByParent = subdivisionPlaces.reduce((totals, { id, parentId }) => {
  totals.set(parentId, (totals.get(parentId) || 0) + (landShares.shares[id] || 0));
  return totals;
}, new Map());
for (const [parentId, total] of sharesByParent) {
  assert(
    Math.abs(total - 1) < 0.001,
    `${parentId} subdivision land shares total ${total.toFixed(6)}, not 1`,
    errors,
  );
}

if (errors.length) {
  console.error(`Data integrity audit failed with ${errors.length} problem(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Data integrity audit passed: ${associations.groups.length} sovereign groups, ` +
      `${subdivisionPlaces.length} subdivisions, ${geometryIds.length} geometries.`,
      `${maritimeTargets.features.length} maritime targets.`,
  );
}
