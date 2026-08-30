import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import simplify from "@turf/simplify";
import union from "@turf/union";
import countries from "world-countries";
import { writeMaritimeOverview } from "./build-maritime-overview.mjs";

const inputPath = process.argv[2] ? resolve(process.argv[2]) : null;
const outputPath = resolve(
  process.argv[3] || "public/data/maritime-country-targets.geojson",
);

const MARINE_REGIONS_WFS =
  "https://geo.vliz.be/geoserver/MarineRegions/wfs";
const LAND_AREA_LIMIT_KM2 = 25_000;

// Bouvet's former EEZ was retired, so use its official Norwegian 12 NM
// territorial sea as the interaction aid instead. Brazilian islands that
// roll up into a larger selectable region get compact 24 NM aids; separately
// selectable island regions such as Galapagos keep their complete EEZ.
const SUPPLEMENTAL_MARITIME_AREAS = [
  {
    typeName: "MarineRegions:eez_12nm",
    filter: "mrgid=49119",
    propertyName: "mrgid,territory1,iso_ter1,the_geom",
  },
  {
    typeName: "MarineRegions:eez_24nm",
    filter: "mrgid=49410",
    propertyName: "mrgid,territory1,iso_ter1,the_geom",
    polygonTerritories: [
      { polygonIndex: 0, name: "Atol das Rocas", radiusNm: 24 },
      { polygonIndex: 1, name: "Fernando de Noronha", radiusNm: 24 },
      {
        polygonIndex: 2,
        name: "Saint Peter and Saint Paul Archipelago",
        radiusNm: 24,
      },
    ],
  },
  {
    typeName: "MarineRegions:eez_12nm",
    filter: "mrgid=49178",
    propertyName: "mrgid,territory1,iso_ter1,the_geom",
    polygonTerritories: [
      {
        polygonIndex: 0,
        name: "Abrolhos Archipelago",
        radiusNm: 24,
        drawAsRadius: true,
      },
    ],
  },
  {
    typeName: "MarineRegions:eez_12nm",
    filter: "mrgid=49103",
    propertyName: "mrgid,territory1,iso_ter1,the_geom",
    territoryOverride: { name: "Trindade", alpha3: "" },
    radiusNm: 24,
    drawEachPolygonAsRadius: true,
    compactReplacement: true,
  },
];

const COMPACT_MARITIME_REPLACEMENT_CODES = new Set(["br-es"]);

// Some fragmented archipelagos remain difficult to select from their land
// geometry even when they sit just above the general small-country cutoff.
const HARD_TO_SELECT_COUNTRY_CODES = new Set(["sb"]);

// Monaco's official maritime corridor is a long six-point wedge; its compact
// land callout is a clearer interaction target at the map's maximum zoom.
const MARITIME_EXCLUDED_COUNTRY_CODES = new Set([
  "cy",
  "il",
  "lb",
  "mc",
  "ps",
]);

// Marine Regions publishes several legitimate country subdivisions and remote
// island groups without ISO values. Map the unambiguous records to the place
// that owns them in CPBR Atlas. Disputed records without a single clear app
// destination remain intentionally unmapped.
const MARITIME_TERRITORY_CODE_OVERRIDES = new Map([
  ["Abrolhos Archipelago", "br-ba"],
  ["Alaska", "us-ak"],
  ["Alhucemas Islands", "es"],
  ["Andaman and Nicobar", "in-an"],
  ["Atol das Rocas", "br-rn"],
  ["Azores", "pt-20"],
  ["Bajo Nuevo Bank", "co-sap"],
  ["Canary Islands", "es"],
  ["Ceuta", "es-ce"],
  ["Chafarinas Islands", "es"],
  ["Chagos Archipelago", "io"],
  ["Clipperton Island", "fr"],
  ["Easter Island", "cl-vs"],
  ["Fernando de Noronha", "br-pe"],
  ["Galapagos", "ec-w"],
  ["Hawaii", "us-hi"],
  ["Ile Tromelin", "tf"],
  ["Kuril Islands", "ru"],
  ["Macquarie Island", "au-tas"],
  ["Madeira", "pt-30"],
  ["Melilla", "es-ml"],
  ["Navassa Island", "um"],
  ["Oecusse", "tl"],
  ["Peñón de Vélez de la Gomera", "es"],
  ["Perejil Island", "es"],
  ["Prince Edward Islands", "za"],
  ["Quitasueño Bank", "co-sap"],
  ["Saint Peter and Saint Paul Archipelago", "br-pe"],
  ["Serrana Bank", "co-sap"],
  ["Serranilla Bank", "co-sap"],
  ["Trindade", "br-es"],
]);

// These maritime records identify small or remote pieces of a selectable
// first-level subdivision. Keep them visible in the default Selection aids
// mode, even though their parent countries are too large for the country-area
// heuristic.
const MARITIME_SUBDIVISION_SELECTION_AID_CODES = new Set([
  "au-tas",
  "br-ba",
  "br-es",
  "br-pe",
  "br-rn",
  "cl-vs",
  "co-sap",
  "ec-w",
  "es-ce",
  "es-ml",
  "in-an",
  "pt-20",
  "pt-30",
  "us-hi",
]);

const alpha2ByAlpha3 = Object.fromEntries(
  countries.map((country) => [country.cca3, country.cca2.toLowerCase()]),
);

const selectionAidAlpha3Codes = countries
  .filter(
    (country) =>
      !MARITIME_EXCLUDED_COUNTRY_CODES.has(country.cca2.toLowerCase()) &&
      ((country.area > 0 && country.area < LAND_AREA_LIMIT_KM2) ||
        HARD_TO_SELECT_COUNTRY_CODES.has(country.cca2.toLowerCase())),
  )
  .map((country) => country.cca3)
  .sort();
const selectionAidAlpha2Codes = new Set(
  selectionAidAlpha3Codes
    .map((code) => alpha2ByAlpha3[code])
    .filter(Boolean),
);

async function loadSource() {
  if (inputPath) {
    return JSON.parse(await readFile(inputPath, "utf8"));
  }

  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: "MarineRegions:eez",
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    count: "1000",
    propertyName:
      "mrgid,territory1,iso_ter1,territory2,iso_ter2,territory3,iso_ter3,the_geom",
  });
  const sourceRequests = [
    fetch(`${MARINE_REGIONS_WFS}?${params}`),
    ...SUPPLEMENTAL_MARITIME_AREAS.map(
      ({ typeName, filter, propertyName }) => {
        const supplementalParams = new URLSearchParams({
          service: "WFS",
          version: "2.0.0",
          request: "GetFeature",
          typeNames: typeName,
          outputFormat: "application/json",
          srsName: "EPSG:4326",
          propertyName,
          CQL_FILTER: filter,
        });
        return fetch(`${MARINE_REGIONS_WFS}?${supplementalParams}`);
      },
    ),
  ];
  const responses = await Promise.all(sourceRequests);

  responses.forEach((response) => {
    if (!response.ok) {
      throw new Error(
        `Marine Regions request failed: ${response.status} ${response.statusText}`,
      );
    }
  });

  const collections = await Promise.all(
    responses.map((response) => response.json()),
  );
  return {
    type: "FeatureCollection",
    features: collections.flatMap((collection, collectionIndex) => {
      const territoryOverride =
        collectionIndex > 0
          ? SUPPLEMENTAL_MARITIME_AREAS[collectionIndex - 1]
              .territoryOverride
          : null;

      const supplementalArea =
        collectionIndex > 0
          ? SUPPLEMENTAL_MARITIME_AREAS[collectionIndex - 1]
          : null;

      return collection.features.flatMap((feature) => {
        if (supplementalArea?.polygonTerritories) {
          const polygons =
            feature.geometry.type === "MultiPolygon"
              ? feature.geometry.coordinates
              : [feature.geometry.coordinates];
          return supplementalArea.polygonTerritories.flatMap(
            ({ polygonIndex, name, radiusNm, drawAsRadius }) => {
              let coordinates = polygons[polygonIndex];
              if (!coordinates) return [];
              if (drawAsRadius) {
                coordinates = circleCoordinates(
                  polygonCenter(coordinates),
                  radiusNm,
                );
              }
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  mrgid: `${feature.properties.mrgid}-${polygonIndex}`,
                  territory1: name,
                  iso_ter1: "",
                  preserveOverviewDetail: true,
                  selectionAidRadiusNm: radiusNm,
                },
                geometry: { type: "Polygon", coordinates },
              };
            },
          );
        }

        const normalizedFeature = supplementalArea?.drawEachPolygonAsRadius
          ? {
              ...feature,
              geometry: circlesForGeometry(
                feature.geometry,
                supplementalArea.radiusNm,
              ),
            }
          : feature;

        return territoryOverride
          ? {
              ...normalizedFeature,
              properties: {
                ...normalizedFeature.properties,
                territory1: territoryOverride.name,
                iso_ter1: territoryOverride.alpha3,
                preserveOverviewDetail: true,
                selectionAidRadiusNm: supplementalArea.radiusNm,
                compactReplacement: supplementalArea.compactReplacement,
              },
            }
          : normalizedFeature;
      });
    }),
  };
}

function polygonCenter(polygonCoordinates) {
  const points = polygonCoordinates.flat(2);
  const longitudes = points.filter((_, index) => index % 2 === 0);
  const latitudes = points.filter((_, index) => index % 2 === 1);
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
}

function circleCoordinates([longitude, latitude], radiusNm, steps = 64) {
  const angularDistance = radiusNm / 3440.065;
  const latitudeRadians = latitude * Math.PI / 180;
  const longitudeRadians = longitude * Math.PI / 180;
  const ring = Array.from({ length: steps + 1 }, (_, index) => {
    const bearing = (index / steps) * Math.PI * 2;
    const destinationLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const destinationLongitude = longitudeRadians + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
      Math.cos(angularDistance) -
        Math.sin(latitudeRadians) * Math.sin(destinationLatitude),
    );
    return [
      ((destinationLongitude * 180 / Math.PI + 540) % 360) - 180,
      destinationLatitude * 180 / Math.PI,
    ];
  });
  return [ring];
}

function circlesForGeometry(geometry, radiusNm) {
  const polygons = geometry.type === "MultiPolygon"
    ? geometry.coordinates
    : [geometry.coordinates];
  const circles = polygons.map((polygon) =>
    circleCoordinates(polygonCenter(polygon), radiusNm));
  if (circles.length === 1) {
    return { type: "Polygon", coordinates: circles[0] };
  }

  const dissolved = union({
    type: "FeatureCollection",
    features: circles.map((coordinates) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates },
    })),
  });
  if (!dissolved) throw new Error("Could not dissolve maritime selection aids");
  return dissolved.geometry;
}

function fillPolygonInteriors(geometry) {
  if (geometry.type === "Polygon") {
    if ((geometry.coordinates[0]?.length || 0) < 4) return null;
    return {
      ...geometry,
      coordinates: geometry.coordinates.slice(0, 1),
    };
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates
      .filter((polygon) => (polygon[0]?.length || 0) >= 4)
      .map((polygon) => polygon.slice(0, 1));
    if (!polygons.length) return null;
    return {
      ...geometry,
      coordinates: polygons,
    };
  }

  return geometry;
}

const source = await loadSource();
const sourceFeatures = [...source.features].sort(
  (featureA, featureB) =>
    (Number.parseInt(featureA.properties.mrgid, 10) || 0) -
    (Number.parseInt(featureB.properties.mrgid, 10) || 0),
);

const sourceFeaturesWithTerritories = sourceFeatures.map((feature, index) => {
  const territories = [1, 2, 3]
    .map((position) => {
      const alpha3 = feature.properties[`iso_ter${position}`];
      const name = feature.properties[`territory${position}`];
      const code =
        alpha2ByAlpha3[alpha3] || MARITIME_TERRITORY_CODE_OVERRIDES.get(name);
      if (!code) return null;
      return {
        code,
        name,
      };
    })
    .filter(Boolean)
    .filter(
      (territory, territoryIndex, all) =>
        all.findIndex(({ code }) => code === territory.code) === territoryIndex,
    );

  return { feature, index, territories };
});

// Marine Regions includes separate records for joint regimes and negotiated
// areas. They overlap or adjoin ordinary EEZs and create doubled shading and
// misleading slivers when drawn together. Keep a shared record only as a
// fallback for an app place that has no exclusive record of its own.
const codesWithExclusiveFeature = new Set(
  sourceFeaturesWithTerritories.flatMap(({ territories }) =>
    territories.length === 1
      ? [territories[0].code]
      : [],
  ),
);

const features = sourceFeaturesWithTerritories.flatMap(
  ({ feature, index, territories }) => {
    if (
      !feature.properties.compactReplacement &&
      territories.some(({ code }) =>
        COMPACT_MARITIME_REPLACEMENT_CODES.has(code))
    ) {
      return [];
    }
    const displayTerritories =
      territories.length > 1
        ? territories.filter(({ code }) => !codesWithExclusiveFeature.has(code))
        : territories;

    const selectionAidTerritories = displayTerritories.filter(
      ({ code }) =>
        (selectionAidAlpha2Codes.has(code) ||
          MARITIME_SUBDIVISION_SELECTION_AID_CODES.has(code)) &&
        !MARITIME_EXCLUDED_COUNTRY_CODES.has(code),
    );

    if (!displayTerritories.length) return [];

    const filledGeometry = fillPolygonInteriors(feature.geometry);
    if (!filledGeometry) return [];

    const filledFeature = { ...feature, geometry: filledGeometry };
    let simplified;
    try {
      simplified = simplify(filledFeature, {
        tolerance: 0.025,
        highQuality: false,
        mutate: false,
      });
    } catch {
      simplified = filledFeature;
    }

    return {
      type: "Feature",
      id: `marine-${feature.properties.mrgid || index}`,
      properties: {
        code1: displayTerritories[0]?.code || "",
        name1: displayTerritories[0]?.name || "",
        code2: displayTerritories[1]?.code || "",
        name2: displayTerritories[1]?.name || "",
        code3: displayTerritories[2]?.code || "",
        name3: displayTerritories[2]?.name || "",
        aidCode1: selectionAidTerritories[0]?.code || "",
        aidName1: selectionAidTerritories[0]?.name || "",
        aidCode2: selectionAidTerritories[1]?.code || "",
        aidName2: selectionAidTerritories[1]?.name || "",
        aidCode3: selectionAidTerritories[2]?.code || "",
        aidName3: selectionAidTerritories[2]?.name || "",
        selectionAid: selectionAidTerritories.length > 0,
        preserveOverviewDetail: Boolean(
          feature.properties.preserveOverviewDetail,
        ),
        selectionAidRadiusNm:
          feature.properties.selectionAidRadiusNm || null,
      },
      geometry: simplified.geometry,
    };
  },
);

const output = {
  type: "FeatureCollection",
  attribution:
    "Flanders Marine Institute (2023), Maritime Boundaries and Exclusive Economic Zones (200NM), version 12, https://doi.org/10.14284/632; Contiguous Zones (24NM), version 4, https://doi.org/10.14284/630; Territorial Seas (12NM), version 4, https://doi.org/10.14284/633; CC BY 4.0",
  features,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(output));
await writeMaritimeOverview(
  outputPath,
  resolve(dirname(outputPath), "maritime-country-targets-overview.geojson"),
);

console.log(
  `Wrote ${features.length} maritime features (${features.filter((feature) => feature.properties.selectionAid).length} selection aids) to ${outputPath}`,
);
