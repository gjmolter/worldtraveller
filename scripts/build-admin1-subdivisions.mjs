import { readFile, writeFile } from "node:fs/promises";
import { constants as cryptoConstants } from "node:crypto";
import { request } from "node:https";
import { dirname, resolve } from "node:path";
import { rootCertificates } from "node:tls";
import { fileURLToPath } from "node:url";
import simplify from "@turf/simplify";
import union from "@turf/union";
import area from "@turf/area";
import shp from "shpjs";
import baseSubdivisionDefinitions from "../data/subdivisions.json" with { type: "json" };
import subdivisionExpansion from "../data/subdivision-expansion.json" with { type: "json" };
import southAmericaSubdivisionExpansion from "../data/subdivision-south-america.json" with { type: "json" };

const subdivisionDefinitions = {
  reviewedOn: southAmericaSubdivisionExpansion.reviewedOn,
  sources: [
    ...baseSubdivisionDefinitions.sources,
    ...subdivisionExpansion.sources,
    ...southAmericaSubdivisionExpansion.sources,
  ],
  groups: [
    ...baseSubdivisionDefinitions.groups,
    ...subdivisionExpansion.groups,
    ...southAmericaSubdivisionExpansion.groups,
  ],
  places: [
    ...baseSubdivisionDefinitions.places,
    ...subdivisionExpansion.places,
    ...southAmericaSubdivisionExpansion.places,
  ],
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "public/data/admin1-subdivisions.geojson");
const landSharesOutputPath = resolve(root, "data/subdivision-land-shares.json");
const usBoundaryUrl =
  "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_5m.zip";
const canadaBoundaryUrl =
  "https://services.arcgis.com/lGOekm0RsNxYnT3j/ArcGIS/rest/services/Statistics_Canada_2021_census_boundaries/FeatureServer/0/query";
const brazilBoundaryUrl =
  "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_UF_2025.zip";
const mexicoBoundaryUrl =
  "https://lcidsig.inegi.org.mx/server/rest/services/Hosted/Entidades_federativas_2025/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&geometryPrecision=3&maxAllowableOffset=0.005&f=geojson";
const australiaBoundaryUrl =
  "https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files/STE_2026_AUST_SHP_GDA2020.zip";
const argentinaBoundaryUrl =
  "https://wms.ign.gob.ar/geoserver/ign/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ign%3Aprovincia&outputFormat=application%2Fjson&srsName=EPSG%3A4326";
const germanyBoundaryUrl =
  "https://sgx.geodatenzentrum.de/wfs_vg250?service=WFS&version=2.0.0&request=GetFeature&TYPENAMES=vg250%3Avg250_lan&outputFormat=application%2Fjson&SRSNAME=EPSG%3A4326";
const italyBoundaryUrl =
  "https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip";
const japanBoundaryUrl =
  "https://www1.gsi.go.jp/geowww/globalmap-gsi/download/data/gm-japan/gm-jpn-bnd_u_2_1.zip";
const southAfricaBoundaryUrl =
  "https://services7.arcgis.com/jbdCPRrwkIrZb0KZ/ArcGIS/rest/services/South_Africa_Provinces/FeatureServer/0/query?where=1%3D1&outFields=PR_MDB_C%2CPR_NAME&outSR=4326&returnGeometry=true&geometryPrecision=4&maxAllowableOffset=0.004&f=geojson";
const switzerlandBoundaryUrl =
  "https://data.geo.admin.ch/ch.swisstopo.swissboundaries3d/swissboundaries3d_2026-01/swissboundaries3d_2026-01_2056_5728.shp.zip";
const austriaBoundaryUrl =
  "https://www.statistik.at/gs-open/GEODATA/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=GEODATA%3ASTATISTIK_AUSTRIA_NUTS2_20260101&outputFormat=application%2Fjson&srsName=EPSG%3A4326";
const eurostatNuts2BoundaryUrl =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_2.geojson";
const eurostatNuts3BoundaryUrl =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_3.geojson";
const netherlandsBoundaryUrl =
  "https://service.pdok.nl/kadaster/bestuurlijkegebieden/wfs/v1_0?service=WFS&version=2.0.0&request=GetFeature&typeNames=bestuurlijkegebieden%3AProvinciegebied&outputFormat=application%2Fjson&srsName=EPSG%3A4326";
const colombiaDepartmentsUrl =
  "https://mapas2.igac.gov.co/server/rest/services/limites/limites/MapServer/2/query?where=1%3D1&outFields=DeCodigo%2CDeNombre&outSR=4326&returnGeometry=true&geometryPrecision=4&maxAllowableOffset=0.004&f=geojson";
const colombiaBogotaUrl =
  "https://mapas2.igac.gov.co/server/rest/services/limites/limites/MapServer/1/query?where=MpCodigo%3D%2711001%27&outFields=MpCodigo%2CMpNombre&outSR=4326&returnGeometry=true&geometryPrecision=5&maxAllowableOffset=0.001&f=geojson";
const chileBoundaryUrl =
  "https://services5.arcgis.com/hUyD8u3TeZLKPe4T/arcgis/rest/services/DPA_Simplificada/FeatureServer/3/query?where=1%3D1&outFields=REGION%2CNOM_REGION&outSR=4326&returnGeometry=true&geometryPrecision=4&maxAllowableOffset=0.003&f=geojson";
const newZealandBoundaryUrl =
  "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Regional_Council_2025/FeatureServer/0/query?where=1%3D1&outFields=REGC2025_V1_00%2CREGC2025_V1_00_NAME%2CLAND_AREA_SQ_KM&outSR=4326&returnGeometry=true&geometryPrecision=4&maxAllowableOffset=0.004&f=geojson";
const geoBoundariesUrls = {
  fr: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/FRA/ADM1/geoBoundaries-FRA-ADM1_simplified.geojson",
  pt: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/PRT/ADM1/geoBoundaries-PRT-ADM1_simplified.geojson",
  in: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1_simplified.geojson",
  cn: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/CHN/ADM1/geoBoundaries-CHN-ADM1_simplified.geojson",
  ru: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RUS/ADM1/geoBoundaries-RUS-ADM1_simplified.geojson",
  uy: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/URY/ADM1/geoBoundaries-URY-ADM1_simplified.geojson",
  py: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/PRY/ADM1/geoBoundaries-PRY-ADM1_simplified.geojson",
  bo: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BOL/ADM1/geoBoundaries-BOL-ADM1_simplified.geojson",
  pe: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/PER/ADM1/geoBoundaries-PER-ADM1_simplified.geojson",
  ec: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ECU/ADM1/geoBoundaries-ECU-ADM1_simplified.geojson",
  ve: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/VEN/ADM1/geoBoundaries-VEN-ADM1_simplified.geojson",
  gy: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GUY/ADM1/geoBoundaries-GUY-ADM1_simplified.geojson",
  sr: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/SUR/ADM1/geoBoundaries-SUR-ADM1_simplified.geojson",
};
const inegiIntermediatePath = resolve(
  root,
  "scripts/certificates/sectigo-public-server-authentication-ca-ov-r36.pem",
);

const placeBySource = new Map(
  subdivisionDefinitions.places.map((place) => [
    `${place.parentId}:${place.sourceCode}`,
    place,
  ]),
);

async function fetchResponse(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.status < 500) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 400));
  }
  throw lastError;
}

async function fetchJson(url) {
  let response = await fetchResponse(url, { cache: "no-store" });
  if (response.status === 304) {
    const refreshedUrl = new URL(url);
    refreshedUrl.searchParams.set("_refresh", Date.now().toString());
    response = await fetchResponse(refreshedUrl, { cache: "no-store" });
  }
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchJsonWithAdditionalCa(url, certificatePath) {
  const intermediateCertificate = await readFile(certificatePath, "utf8");
  return new Promise((resolveRequest, rejectRequest) => {
    const requestHandle = request(
      url,
      { ca: [...rootCertificates, intermediateCertificate] },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          if (response.statusCode !== 200) {
            rejectRequest(
              new Error(`${url} returned HTTP ${response.statusCode}`),
            );
            return;
          }
          try {
            resolveRequest(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            rejectRequest(error);
          }
        });
      },
    );
    requestHandle.on("error", rejectRequest);
    requestHandle.end();
  });
}

async function fetchBufferWithLegacyServerConnect(url) {
  return new Promise((resolveRequest, rejectRequest) => {
    const requestHandle = request(
      url,
      { secureOptions: cryptoConstants.SSL_OP_LEGACY_SERVER_CONNECT },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          if (response.statusCode !== 200) {
            rejectRequest(
              new Error(`${url} returned HTTP ${response.statusCode}`),
            );
            return;
          }
          resolveRequest(Buffer.concat(chunks));
        });
      },
    );
    requestHandle.on("error", rejectRequest);
    requestHandle.end();
  });
}

async function fetchUsStates() {
  const response = await fetchResponse(usBoundaryUrl);
  if (!response.ok) {
    throw new Error(`U.S. Census boundary request failed: HTTP ${response.status}`);
  }
  const collection = await shp(await response.arrayBuffer());
  return collection.features
    .map((feature) => {
      const sourceCode = feature.properties.STATEFP;
      const place = placeBySource.get(`us:${sourceCode}`);
      if (!place) return null;
      return toAppFeature(feature, place, 0.012);
    })
    .filter(Boolean);
}

async function fetchBrazilianStates() {
  const response = await fetchResponse(brazilBoundaryUrl);
  if (!response.ok) {
    throw new Error(`IBGE boundary request failed: HTTP ${response.status}`);
  }
  const collection = await shp(await response.arrayBuffer());
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.CD_UF);
    const place = placeBySource.get(`br:${sourceCode}`);
    if (!place) throw new Error(`Unexpected IBGE federation unit: ${sourceCode}`);
    return toAppFeature(feature, place, 0.006);
  });
}

async function fetchMexicanFederalEntities() {
  const collection = await fetchJsonWithAdditionalCa(
    mexicoBoundaryUrl,
    inegiIntermediatePath,
  );
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.cvegeo).padStart(2, "0");
    const place = placeBySource.get(`mx:${sourceCode}`);
    if (!place) throw new Error(`Unexpected INEGI federal entity: ${sourceCode}`);
    return toAppFeature(feature, place, 0.004);
  });
}

async function fetchAustralianStatesAndTerritories() {
  const response = await fetchResponse(australiaBoundaryUrl);
  if (!response.ok) {
    throw new Error(`ABS boundary request failed: HTTP ${response.status}`);
  }
  const collection = await shp(await response.arrayBuffer());
  return collection.features
    .map((feature) => {
      const sourceCode = String(feature.properties.STE_CODE26);
      const place = placeBySource.get(`au:${sourceCode}`);
      if (!place) return null;
      return toAppFeature(feature, place, 0.008);
    })
    .filter(Boolean);
}

async function fetchArgentineProvinces() {
  const collection = await fetchJson(argentinaBoundaryUrl);
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.in1).padStart(2, "0");
    const place = placeBySource.get(`ar:${sourceCode}`);
    if (!place) throw new Error(`Unexpected IGN province: ${sourceCode}`);
    const preparedFeature = sourceCode === "94"
      ? restrictTierraDelFuego(feature)
      : feature;
    return toAppFeature(preparedFeature, place, 0.006);
  });
}

async function fetchGermanStates() {
  const collection = await fetchJson(germanyBoundaryUrl);
  const featuresByCode = Map.groupBy(
    collection.features,
    (feature) => String(feature.properties.ags).padStart(2, "0"),
  );
  return [...featuresByCode].map(([sourceCode, sourceFeatures]) => {
    const place = placeBySource.get(`de:${sourceCode}`);
    if (!place) throw new Error(`Unexpected BKG state: ${sourceCode}`);
    return toAppFeature(combineFeatures(sourceFeatures), place, 0.004);
  });
}

async function fetchItalianRegions() {
  const response = await fetchResponse(italyBoundaryUrl);
  if (!response.ok) {
    throw new Error(`Istat boundary request failed: HTTP ${response.status}`);
  }
  const collections = await shp(await response.arrayBuffer());
  const regionCollection = collections.find(({ fileName }) =>
    fileName.includes("Reg01012026_g/"),
  );
  if (!regionCollection) throw new Error("Istat region layer was not found");
  return regionCollection.features.map((feature) => {
    const sourceCode = String(feature.properties.COD_REG);
    const place = placeBySource.get(`it:${sourceCode}`);
    if (!place) throw new Error(`Unexpected Istat region: ${sourceCode}`);
    return toAppFeature(feature, place, 0.003);
  });
}

async function fetchJapanesePrefectures() {
  const collections = await shp(
    await fetchBufferWithLegacyServerConnect(japanBoundaryUrl),
  );
  const municipalityCollection = collections.find(({ fileName }) =>
    fileName.endsWith("polbnda_jpn"),
  );
  if (!municipalityCollection) {
    throw new Error("GSI administrative-area layer was not found");
  }
  const featuresByCode = Map.groupBy(
    municipalityCollection.features,
    japanesePrefectureCode,
  );
  return [...featuresByCode].map(([sourceCode, sourceFeatures]) => {
    const place = placeBySource.get(`jp:${sourceCode}`);
    if (!place) throw new Error(`Unexpected GSI prefecture: ${sourceCode}`);
    const cleanedFeatures = sourceFeatures.map((feature) => ({
      ...feature,
      geometry: stripDegenerateRings(feature.geometry),
    }));
    const dissolved = union({
      type: "FeatureCollection",
      features: cleanedFeatures,
    });
    if (!dissolved) throw new Error(`Could not dissolve ${place.name}`);
    const preparedFeature = sourceCode === "01"
      ? restrictHokkaido(dissolved)
      : dissolved;
    return toAppFeature(preparedFeature, place, 0.003);
  });
}

async function fetchSouthAfricanProvinces() {
  const collection = await fetchJson(southAfricaBoundaryUrl);
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.PR_MDB_C);
    const place = placeBySource.get(`za:${sourceCode}`);
    if (!place) throw new Error(`Unexpected South African province: ${sourceCode}`);
    return toAppFeature(feature, place, 0.004);
  });
}

async function fetchSwissCantons() {
  const response = await fetchResponse(switzerlandBoundaryUrl);
  if (!response.ok) {
    throw new Error(`swisstopo boundary request failed: HTTP ${response.status}`);
  }
  const collections = await shp(await response.arrayBuffer());
  const cantonCollection = collections.find(({ fileName }) =>
    fileName.includes("KANTONSGEBIET"),
  );
  if (!cantonCollection) throw new Error("swisstopo canton layer was not found");
  return cantonCollection.features.map((feature) => {
    const sourceCode = String(feature.properties.KANTONSNUM);
    const place = placeBySource.get(`ch:${sourceCode}`);
    if (!place) throw new Error(`Unexpected Swiss canton: ${sourceCode}`);
    return toAppFeature(feature, place, 0.0015);
  });
}

async function fetchAustrianStates() {
  const collection = await fetchJson(austriaBoundaryUrl);
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.g_id);
    const place = placeBySource.get(`at:${sourceCode}`);
    if (!place) throw new Error(`Unexpected Austrian state: ${sourceCode}`);
    return toAppFeature(feature, place, 0.0015);
  });
}

let eurostatNuts2Promise;
let eurostatNuts3Promise;

function fetchEurostatNuts(level) {
  if (level === 2) {
    eurostatNuts2Promise ||= fetchJson(eurostatNuts2BoundaryUrl);
    return eurostatNuts2Promise;
  }
  eurostatNuts3Promise ||= fetchJson(eurostatNuts3BoundaryUrl);
  return eurostatNuts3Promise;
}

async function fetchSpanishRegions() {
  const collection = await fetchEurostatNuts(2);
  return collection.features
    .filter(({ properties }) => properties.CNTR_CODE === "ES")
    .map((feature) => {
      const sourceCode = feature.properties.NUTS_ID;
      const place = placeBySource.get(`es:${sourceCode}`);
      if (!place) return null;
      return toAppFeature(feature, place, 0.003);
    })
    .filter(Boolean);
}

async function fetchDutchProvinces() {
  const collection = await fetchJson(netherlandsBoundaryUrl);
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.code);
    const place = placeBySource.get(`nl:${sourceCode}`);
    if (!place) throw new Error(`Unexpected Dutch province: ${sourceCode}`);
    return toAppFeature(feature, place, 0.0015);
  });
}

async function fetchPolishVoivodeships() {
  const collection = await fetchEurostatNuts(2);
  const featuresByCode = new Map(
    collection.features
      .filter(({ properties }) => properties.CNTR_CODE === "PL")
      .map((feature) => [feature.properties.NUTS_ID, feature]),
  );
  return subdivisionDefinitions.places
    .filter(({ parentId }) => parentId === "pl")
    .map((place) => {
      const sourceFeatures = place.sourceCode
        .split("+")
        .map((sourceCode) => featuresByCode.get(sourceCode))
        .filter(Boolean);
      if (sourceFeatures.length !== place.sourceCode.split("+").length) {
        throw new Error(`Missing Polish NUTS region for ${place.sourceCode}`);
      }
      return toAppFeature(combineFeatures(sourceFeatures), place, 0.003);
    });
}

async function fetchColombianDepartments() {
  const [departments, bogota] = await Promise.all([
    fetchJson(colombiaDepartmentsUrl),
    fetchJson(colombiaBogotaUrl),
  ]);
  return [...departments.features, ...bogota.features]
    .filter((feature) => String(feature.properties.DeCodigo || feature.properties.MpCodigo) !== "00")
    .map((feature) => {
      const sourceCode = String(
        feature.properties.DeCodigo || feature.properties.MpCodigo,
      ).padStart(2, "0");
      const place = placeBySource.get(`co:${sourceCode}`);
      if (!place) throw new Error(`Unexpected Colombian administrative area: ${sourceCode}`);
      const tolerance = sourceCode === "88" || sourceCode === "11001"
        ? 0.001
        : 0.004;
      return toAppFeature(feature, place, tolerance);
    });
}

async function fetchChileanRegions() {
  const collection = await fetchJson(chileBoundaryUrl);
  return collection.features.map((feature) => {
    const sourceCode = String(feature.properties.REGION);
    const place = placeBySource.get(`cl:${sourceCode}`);
    if (!place) throw new Error(`Unexpected Chilean region: ${sourceCode}`);
    const preparedFeature = sourceCode === "12"
      ? restrictChileanAntarcticClaim(feature)
      : feature;
    return toAppFeature(preparedFeature, place, 0.003);
  });
}

async function fetchNorwegianCounties() {
  const collection = await fetchEurostatNuts(3);
  return collection.features
    .filter(({ properties }) =>
      placeBySource.has(`no:${properties.NUTS_ID}`),
    )
    .map((feature) =>
      toAppFeature(
        feature,
        placeBySource.get(`no:${feature.properties.NUTS_ID}`),
        0.0025,
      ),
    );
}

async function fetchSwedishCounties() {
  const collection = await fetchEurostatNuts(3);
  return collection.features
    .filter(({ properties }) =>
      placeBySource.has(`se:${properties.NUTS_ID}`),
    )
    .map((feature) =>
      toAppFeature(
        feature,
        placeBySource.get(`se:${feature.properties.NUTS_ID}`),
        0.0025,
      ),
    );
}

async function fetchNewZealandRegions() {
  const collection = await fetchJson(newZealandBoundaryUrl);
  return collection.features
    .map((feature) => {
      const sourceCode = String(feature.properties.REGC2025_V1_00);
      const place = placeBySource.get(`nz:${sourceCode}`);
      if (!place) return null;
      const landAreaSqKm = Number(feature.properties.LAND_AREA_SQ_KM);
      if (!Number.isFinite(landAreaSqKm) || landAreaSqKm <= 0) {
        throw new Error(`Invalid Stats NZ land area for ${sourceCode}`);
      }
      return toAppFeature(feature, place, 0.003, { land_area_sq_km: landAreaSqKm });
    })
    .filter(Boolean);
}

async function fetchGeoBoundariesSubdivisions(parentId, tolerance) {
  const collection = await fetchJson(geoBoundariesUrls[parentId]);
  return collection.features
    .map((feature) => {
      const sourceCode =
        parentId === "cn"
          ? feature.properties.shapeName
          : parentId === "ec"
            ? feature.properties.shapeName
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
          : feature.properties.shapeISO.split("-").slice(1).join("-");
      const place = placeBySource.get(`${parentId}:${sourceCode}`);
      if (!place) return null;
      return toAppFeature(feature, place, tolerance);
    })
    .filter(Boolean);
}

function japanesePrefectureCode(feature) {
  const administrativeCode = String(feature.properties.adm_code);
  if (/^\d{5}$/.test(administrativeCode)) {
    return administrativeCode.slice(0, 2);
  }
  const sourceName = feature.properties.nam;
  if (sourceName === "Tokyo To") return "13";
  if (sourceName === "Aichi Ken") return "23";
  throw new Error(`Unassigned GSI administrative area: ${sourceName}`);
}

async function fetchCanadianProvinces() {
  const places = subdivisionDefinitions.places.filter(
    ({ parentId }) => parentId === "ca",
  );
  const collections = await Promise.all(
    places.map(({ sourceCode }) => {
      const query = new URLSearchParams({
        where: `PRUID_STR='${sourceCode}'`,
        outFields: "PRUID_STR,PRNAME_E,AREA_SQKM",
        outSR: "4326",
        returnGeometry: "true",
        maxAllowableOffset: "0.02",
        geometryPrecision: "4",
        f: "geojson",
      });
      return fetchJson(`${canadaBoundaryUrl}?${query}`);
    }),
  );
  return collections.flatMap(({ features }) => features).map((feature) => {
    const sourceCode = feature.properties.PRUID_STR;
    const place = placeBySource.get(`ca:${sourceCode}`);
    if (!place) {
      throw new Error(`Unexpected Canadian province/territory code: ${sourceCode}`);
    }
    return toAppFeature(simplifyCanadianFeature(feature, 0.012), place);
  });
}

function toAppFeature(feature, place, tolerance, additionalProperties = {}) {
  let simplified = {
    ...feature,
    geometry: stripDegenerateRings(feature.geometry),
  };
  if (tolerance) {
    try {
      simplified = simplify(simplified, {
        tolerance,
        highQuality: true,
        mutate: false,
      });
    } catch (error) {
      console.warn(
        `Keeping server-generalized geometry for ${place.id}: ${error.message}`,
      );
    }
  }
  return {
    type: "Feature",
    id: place.id,
    properties: {
      app_id: place.id,
      parent_id: place.parentId,
      group_id: place.groupId,
      name: place.name,
      code: place.code,
      kind: place.kind,
      source_code: place.sourceCode,
      ...additionalProperties,
    },
    geometry: simplified.geometry,
  };
}

function stripDegenerateRings(geometry) {
  const cleanRing = (ring) => {
    let coordinates = ring.filter(
      (coordinate, index) =>
        index === 0 ||
        coordinate[0] !== ring[index - 1][0] ||
        coordinate[1] !== ring[index - 1][1],
    );
    const first = coordinates[0];
    const last = coordinates.at(-1);
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
      coordinates = [...coordinates, first];
    }
    const uniquePoints = new Set(
      coordinates.slice(0, -1).map(([longitude, latitude]) =>
        `${longitude},${latitude}`,
      ),
    );
    return coordinates.length >= 4 && uniquePoints.size >= 3
      ? coordinates
      : null;
  };
  const cleanPolygon = (polygon) => {
    const rings = polygon.map(cleanRing).filter(Boolean);
    return rings[0]?.length >= 4 ? rings : null;
  };

  if (geometry.type === "Polygon") {
    return { ...geometry, coordinates: cleanPolygon(geometry.coordinates) || [] };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(cleanPolygon).filter(Boolean),
    };
  }
  return geometry;
}

function simplifyCanadianFeature(feature, tolerance) {
  const geometry = stripDegenerateRings(feature.geometry);
  const polygons = geometry.type === "MultiPolygon"
    ? geometry.coordinates
    : [geometry.coordinates];
  const simplifiedPolygons = polygons
    .filter((polygon) => polygonSpan(polygon[0]) >= 0.002)
    .map((polygon) => {
      const outerRing = polygon[0];
      if (!outerRing) return null;
      try {
        return simplify(
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [outerRing] },
          },
          { tolerance, highQuality: true, mutate: false },
        ).geometry.coordinates;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!simplifiedPolygons.length) {
    throw new Error(`No usable polygons remain for ${feature.properties.PRUID_STR}`);
  }
  return {
    ...feature,
    geometry: {
      type: "MultiPolygon",
      coordinates: simplifiedPolygons,
    },
  };
}

function polygonSpan(ring = []) {
  if (!ring.length) return 0;
  const longitudes = ring.map(([longitude]) => longitude);
  const latitudes = ring.map(([, latitude]) => latitude);
  return (
    (Math.max(...longitudes) - Math.min(...longitudes)) *
    (Math.max(...latitudes) - Math.min(...latitudes))
  );
}

function combineFeatures(features) {
  const polygons = features.flatMap((feature) =>
    feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates],
  );
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates: polygons },
  };
}

function polygonBounds(polygon) {
  let west = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  polygon.forEach((ring) => {
    ring.forEach(([longitude, latitude]) => {
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
      north = Math.max(north, latitude);
    });
  });
  return { west, east, north };
}

function restrictHokkaido(feature) {
  const polygons = feature.geometry.type === "MultiPolygon"
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates];
  const administeredPolygons = polygons.filter(
    (polygon) => polygonBounds(polygon).east <= 145.9,
  );
  return {
    ...feature,
    geometry: {
      type: "MultiPolygon",
      coordinates: administeredPolygons,
    },
  };
}

function restrictTierraDelFuego(feature) {
  const polygons = feature.geometry.type === "MultiPolygon"
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates];
  const administeredPolygons = polygons.filter((polygon) => {
    const { west, north } = polygonBounds(polygon);
    return west < -63 && north > -57.5;
  });
  if (!administeredPolygons.length) {
    throw new Error("No administered Tierra del Fuego polygons remain");
  }
  return {
    ...feature,
    geometry: {
      type: "MultiPolygon",
      coordinates: administeredPolygons,
    },
  };
}

function restrictChileanAntarcticClaim(feature) {
  const polygons = feature.geometry.type === "MultiPolygon"
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates];
  const administeredPolygons = polygons.filter(
    (polygon) => polygonBounds(polygon).north > -60,
  );
  if (!administeredPolygons.length) {
    throw new Error("No administered Magallanes polygons remain");
  }
  return {
    ...feature,
    geometry: {
      type: "MultiPolygon",
      coordinates: administeredPolygons,
    },
  };
}

const features = [
  ...(await fetchUsStates()),
  ...(await fetchCanadianProvinces()),
  ...(await fetchBrazilianStates()),
  ...(await fetchMexicanFederalEntities()),
  ...(await fetchAustralianStatesAndTerritories()),
  ...(await fetchArgentineProvinces()),
  ...(await fetchGermanStates()),
  ...(await fetchItalianRegions()),
  ...(await fetchJapanesePrefectures()),
  ...(await fetchSouthAfricanProvinces()),
  ...(await fetchSwissCantons()),
  ...(await fetchAustrianStates()),
  ...(await fetchSpanishRegions()),
  ...(await fetchDutchProvinces()),
  ...(await fetchPolishVoivodeships()),
  ...(await fetchColombianDepartments()),
  ...(await fetchChileanRegions()),
  ...(await fetchNorwegianCounties()),
  ...(await fetchSwedishCounties()),
  ...(await fetchNewZealandRegions()),
  ...(await fetchGeoBoundariesSubdivisions("fr", 0.006)),
  ...(await fetchGeoBoundariesSubdivisions("pt", 0.004)),
  ...(await fetchGeoBoundariesSubdivisions("in", 0.008)),
  ...(await fetchGeoBoundariesSubdivisions("cn", 0.012)),
  ...(await fetchGeoBoundariesSubdivisions("ru", 0.015)),
  ...(await fetchGeoBoundariesSubdivisions("uy", 0.004)),
  ...(await fetchGeoBoundariesSubdivisions("py", 0.006)),
  ...(await fetchGeoBoundariesSubdivisions("bo", 0.008)),
  ...(await fetchGeoBoundariesSubdivisions("pe", 0.006)),
  ...(await fetchGeoBoundariesSubdivisions("ec", 0.004)),
  ...(await fetchGeoBoundariesSubdivisions("ve", 0.006)),
  ...(await fetchGeoBoundariesSubdivisions("gy", 0.008)),
  ...(await fetchGeoBoundariesSubdivisions("sr", 0.006)),
];
const expectedIds = new Set(subdivisionDefinitions.places.map(({ id }) => id));
const actualIds = new Set(features.map(({ id }) => id));
const missing = [...expectedIds].filter((id) => !actualIds.has(id));
if (missing.length) throw new Error(`Missing subdivision boundaries: ${missing.join(", ")}`);

const areasByParent = Map.groupBy(features, ({ properties }) => properties.parent_id);
const landShares = Object.fromEntries(
  [...areasByParent.values()].flatMap((parentFeatures) => {
    const areas = parentFeatures.map((feature) =>
      feature.properties.land_area_sq_km || area(feature),
    );
    const totalArea = areas.reduce((total, featureArea) => total + featureArea, 0);
    if (!Number.isFinite(totalArea) || totalArea <= 0) {
      throw new Error(`Invalid subdivision area total for ${parentFeatures[0].properties.parent_id}`);
    }
    let assignedShare = 0;
    return parentFeatures.map((feature, index) => {
      const share = index === parentFeatures.length - 1
        ? Number((1 - assignedShare).toFixed(10))
        : Number((areas[index] / totalArea).toFixed(10));
      assignedShare += share;
      return [feature.id, share];
    });
  }),
);

for (const [parentId, parentFeatures] of areasByParent) {
  const shareTotal = parentFeatures.reduce(
    (total, feature) => total + landShares[feature.id],
    0,
  );
  if (Math.abs(shareTotal - 1) > 1e-6) {
    throw new Error(`Subdivision land shares for ${parentId} total ${shareTotal}`);
  }
}

await writeFile(
  outputPath,
  `${JSON.stringify({ type: "FeatureCollection", features })}\n`,
);
await writeFile(
  landSharesOutputPath,
  `${JSON.stringify({ reviewedOn: subdivisionDefinitions.reviewedOn, shares: landShares }, null, 2)}\n`,
);
console.log(`Wrote ${features.length} subdivision polygons to ${outputPath}`);
console.log(`Wrote normalized subdivision land shares to ${landSharesOutputPath}`);
