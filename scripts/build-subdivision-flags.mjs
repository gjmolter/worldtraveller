import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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
const outputDirectory = resolve(root, "public/img/subdivision-flags");
const userAgent = "CPBR-Atlas-flag-builder/1.0 (https://atlas.cpbr.digital)";

// These Commons files fill gaps where Wikidata does not currently expose P41
// for the ISO 3166-2 item. The South African banners are conventional visual
// identifiers; only Mpumalanga has adopted an official provincial flag.
const commonsFileOverrides = {
  "mx-agu": "Flag of Aguascalientes.svg",
  "mx-bcn": "Flag of Baja California.svg",
  "mx-cam": "Flag of Campeche.svg",
  "mx-coa": "Flag of Coahuila.svg",
  "mx-chp": "Flag of Chiapas.svg",
  "mx-hid": "Flag of Hidalgo.svg",
  "mx-mex": "Flag of the State of Mexico.svg",
  "mx-mic": "Flag of Michoacan.svg",
  "mx-mor": "Flag of Morelos.svg",
  "mx-nay": "Flag of Nayarit.svg",
  "mx-nle": "Flag of Nuevo Leon.svg",
  "mx-pue": "Flag of Puebla.svg",
  "mx-slp": "Flag of San Luis Potosi.svg",
  "mx-sin": "Flag of Sinaloa.svg",
  "mx-son": "Flag of Sonora.svg",
  "mx-tam": "Flag of Tamaulipas.svg",
  "mx-ver": "Flag of Veracruz.svg",
  "mx-zac": "Flag of Zacatecas.svg",
  "au-act": "Flag of the Australian Capital Territory.svg",
  "za-gt": "Flag of the Gauteng Province.png",
  "za-kzn": "Flag of the KwaZulu-Natal Province.png",
  "za-lp": "Flag of the Limpopo Province.png",
  "se-s": "Värmlands län vapenflagga.svg",
  "nz-nsn": "Nelson flag.svg",
  "fr-ges": "Flag of the Region of Grand Est (Variant 1).svg",
  "ec-e": "Bandera Provincia Esmeraldas.svg",
  "ec-p": "Bandera Provincia Pichincha.svg",
  "ve-a": "Flag of Caracas (2022).svg",
  "gy-ba": "Flag of Barima-Waini Region.gif",
  "gy-cu": "Yellow, white, green flag.svg",
  "gy-de": "Red and black flag.svg",
  "gy-eb": "Green and red flag.svg",
  "gy-es": "Flagge Preußen - Provinz Westfalen (1882).svg",
  "gy-ma": "Flag black green 5x3.svg",
  "gy-pm": "Flag white green 5x3.svg",
  "gy-pt": "Green, black, yellow flag.svg",
  "gy-ud": "Flag yellow black 5x3.svg",
  "gy-ut": "Flag green white red 5x3.svg",
};

const newZealandNationalFlagFallbackIds = new Set([
  "nz-auk", "nz-bop", "nz-can", "nz-gis", "nz-hkb", "nz-mbh", "nz-mwt",
  "nz-ntl", "nz-stl", "nz-tas", "nz-tki", "nz-wgn", "nz-wko", "nz-wtc",
]);
const parentCountryFlagFallbacks = {
  cn: "Flag of the People's Republic of China.svg",
  fr: "Flag of France.svg",
  in: "Flag of India.svg",
  nz: "Flag of New Zealand.svg",
  pt: "Flag of Portugal.svg",
  bo: "Flag of Bolivia.svg",
  ec: "Flag of Ecuador.svg",
  gy: "Flag of Guyana.svg",
  pe: "Flag of Peru.svg",
  py: "Flag of Paraguay.svg",
  sr: "Flag of Suriname.svg",
  uy: "Flag of Uruguay.svg",
  ve: "Flag of Venezuela.svg",
};
const parentCountryFlagFallbackIds = new Set([
  ...newZealandNationalFlagFallbackIds,
  ...subdivisions
    .filter(
      ({ parentId, kind }) =>
        parentId === "cn" ||
        parentId === "in" ||
        (parentId === "pt" && kind === "District"),
    )
    .map(({ id }) => id),
]);
for (const subdivision of subdivisions) {
  if (parentCountryFlagFallbackIds.has(subdivision.id)) {
    commonsFileOverrides[subdivision.id] =
      parentCountryFlagFallbacks[subdivision.parentId];
  }
}

const preferredCommonsFiles = {
  // Bavaria has two equally official flags. The lozengy version is the more
  // distinctive choice at the small size used in the progress lists.
  "de-by": "Flag of Bavaria (lozengy).svg",
};

const officialSourceFlagIds = new Set([
  "gy-ba",
  "gy-cu",
  "gy-de",
  "gy-eb",
  "gy-es",
  "gy-ma",
  "gy-pm",
  "gy-pt",
  "gy-ud",
  "gy-ut",
]);

const sleep = (milliseconds) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

const stripHtml = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const fetchWithRetry = async (url, options = {}, attempts = 5) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: { "User-Agent": userAgent, ...options.headers },
    });

    if (response.ok) return response;
    if (attempt === attempts || ![429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }

    await sleep(750 * 2 ** (attempt - 1));
  }

  throw new Error(`Unable to fetch ${url}`);
};

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
const wikidataFlags = new Map();

for (const subdivisionChunk of chunk(subdivisions, 120)) {
  const values = subdivisionChunk
    .map((subdivision) =>
      JSON.stringify(`${subdivision.parentId.toUpperCase()}-${subdivision.code}`),
    )
    .join(" ");
  const sparql = `
SELECT ?iso ?item ?flag WHERE {
  VALUES ?iso { ${values} }
  ?item wdt:P300 ?iso;
        wdt:P41 ?flag.
}`;
  const sparqlUrl =
    "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(sparql);
  const sparqlResponse = await fetchWithRetry(sparqlUrl, {
    headers: { Accept: "application/sparql-results+json" },
  });
  const sparqlData = await sparqlResponse.json();

  for (const binding of sparqlData.results.bindings) {
    const isoCode = binding.iso.value;
    const fileName = decodeURIComponent(
      binding.flag.value.split("/").at(-1),
    ).replaceAll("_", " ");
    const existing = wikidataFlags.get(isoCode) || [];
    existing.push({
      fileName,
      wikidataId: binding.item.value.split("/").at(-1),
    });
    wikidataFlags.set(isoCode, existing);
  }
  await sleep(350);
}

const missingFlagIds = subdivisions.filter((subdivision) => {
  const isoCode = `${subdivision.parentId.toUpperCase()}-${subdivision.code}`;
  return !(wikidataFlags.get(isoCode)?.length || commonsFileOverrides[subdivision.id]);
});
for (const subdivision of missingFlagIds) {
  const fallback = parentCountryFlagFallbacks[subdivision.parentId];
  if (!fallback) continue;
  commonsFileOverrides[subdivision.id] = fallback;
  parentCountryFlagFallbackIds.add(subdivision.id);
}
const unresolvedFlagIds = subdivisions.filter((subdivision) => {
  const isoCode = `${subdivision.parentId.toUpperCase()}-${subdivision.code}`;
  return !(wikidataFlags.get(isoCode)?.length || commonsFileOverrides[subdivision.id]);
});
if (unresolvedFlagIds.length) {
  throw new Error(
    `No subdivision flag found for: ${unresolvedFlagIds
      .map(({ id, parentId, code }) => `${id} (${parentId.toUpperCase()}-${code})`)
      .join(", ")}`,
  );
}

const assets = subdivisions.map((subdivision) => {
  const isoCode = `${subdivision.parentId.toUpperCase()}-${subdivision.code}`;
  const candidates = wikidataFlags.get(isoCode) || [];
  const preferredFile = preferredCommonsFiles[subdivision.id];
  const candidate = preferredFile
    ? candidates.find(({ fileName }) => fileName === preferredFile)
    : candidates[0];
  const overrideFile = commonsFileOverrides[subdivision.id];

  const southAfricanConvention =
    subdivision.parentId === "za" && subdivision.id !== "za-mp";
  const nationalFlagFallback = parentCountryFlagFallbackIds.has(subdivision.id);
  const officialSourceFlag = officialSourceFlagIds.has(subdivision.id);

  return {
    ...subdivision,
    isoCode,
    fileName: overrideFile || candidate.fileName,
    wikidataId: candidate?.wikidataId || null,
    status: officialSourceFlag
      ? "official-source"
      : nationalFlagFallback
      ? "parent-country-fallback"
      : southAfricanConvention
      ? "unofficial-conventional"
      : overrideFile
        ? "reviewed-commons-file"
        : "wikidata-flag-image",
  };
});

const normalizeTitle = (title) => title.replaceAll("_", " ").normalize("NFC").toLowerCase();
const commonsMetadata = new Map();

for (const assetChunk of chunk(assets, 40)) {
  const titles = assetChunk.map(({ fileName }) => `File:${fileName}`).join("|");
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    redirects: "1",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime|timestamp",
    iiurlwidth: "256",
    titles,
  }).toString();

  const response = await fetchWithRetry(url);
  const data = await response.json();
  for (const page of Object.values(data.query.pages)) {
    if (!page.imageinfo?.[0]) continue;
    commonsMetadata.set(normalizeTitle(page.title), page);
  }
  await sleep(300);
}

await mkdir(outputDirectory, { recursive: true });
const attribution = [];
const runtimeAssets = {};
const imageBytesByUrl = new Map();

const fetchImageBytes = (sourceUrl) => {
  if (!imageBytesByUrl.has(sourceUrl)) {
    imageBytesByUrl.set(
      sourceUrl,
      fetchWithRetry(sourceUrl)
        .then((response) => response.arrayBuffer())
        .then((buffer) => Buffer.from(buffer)),
    );
  }
  return imageBytesByUrl.get(sourceUrl);
};

for (const assetChunk of chunk(assets, 4)) {
  const downloaded = await Promise.all(
    assetChunk.map(async (asset) => {
      const page = commonsMetadata.get(normalizeTitle(`File:${asset.fileName}`));
      const imageInfo = page?.imageinfo?.[0];
      if (!imageInfo) {
        throw new Error(`Commons metadata missing for File:${asset.fileName}`);
      }

      const outputName = `${asset.id}.png`;
      const outputPath = resolve(outputDirectory, outputName);
      let wroteImage = false;
      try {
        await access(outputPath);
      } catch {
        const sourceUrl = imageInfo.thumburl || imageInfo.url;
        const imageBytes = await fetchImageBytes(sourceUrl);
        await sharp(imageBytes, { density: 144 })
          .resize({ width: 192, height: 128, fit: "inside", withoutEnlargement: false })
          .png({ compressionLevel: 9, palette: true })
          .toFile(outputPath);
        wroteImage = true;
      }

      const metadata = imageInfo.extmetadata || {};
      const commonsTitle = page.title.slice("File:".length);
      const sourcePage = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(
        commonsTitle.replaceAll(" ", "_"),
      )}`;
      const displayStatus =
        asset.status === "official-source"
          ? "Official regional flag"
          : asset.status === "parent-country-fallback"
          ? "No distinct official subdivision flag used; parent-country flag shown as a fallback"
          : asset.status === "unofficial-conventional"
          ? "Conventional provincial banner; not an official provincial flag"
          : "Subdivision flag";

      runtimeAssets[asset.id] = {
        path: `/img/subdivision-flags/${outputName}`,
        status: asset.status,
      };
      attribution.push({
        id: asset.id,
        name: asset.name,
        parentId: asset.parentId,
        isoCode: asset.isoCode,
        displayStatus,
        wikidataId: asset.wikidataId,
        commonsFile: commonsTitle,
        sourcePage,
        sourceUpdatedAt: imageInfo.timestamp || null,
        license: stripHtml(metadata.LicenseShortName?.value),
        licenseUrl: metadata.LicenseUrl?.value || null,
        artist: stripHtml(metadata.Artist?.value),
        credit: stripHtml(metadata.Credit?.value),
      });
      return wroteImage;
    }),
  );
  if (downloaded.some(Boolean)) await sleep(250);
}

const orderedRuntimeAssets = Object.fromEntries(
  Object.entries(runtimeAssets).sort(([left], [right]) => left.localeCompare(right)),
);
attribution.sort((left, right) => left.id.localeCompare(right.id));

await writeFile(
  resolve(root, "data/subdivision-flag-assets.json"),
  `${JSON.stringify({ reviewedOn: "2026-08-24", assets: orderedRuntimeAssets }, null, 2)}\n`,
);
await mkdir(resolve(root, "public/data"), { recursive: true });
await writeFile(
  resolve(root, "public/data/subdivision-flag-attribution.json"),
  `${JSON.stringify(
    {
      reviewedOn: "2026-08-24",
      mapping: {
        isoProperty: "https://www.wikidata.org/wiki/Property:P300",
        flagProperty: "https://www.wikidata.org/wiki/Property:P41",
      },
      note: "Wikidata and Wikimedia Commons identify the artwork. Official status varies by jurisdiction. South African province banners other than Mpumalanga are conventional visual identifiers, not official provincial flags. The parent-country flag is shown as an explicit fallback where no defensible matching subdivision flag was found, including mainland Chinese and Indian subdivisions, Portugal's districts, most New Zealand regions, most Suriname districts, and the Montevideo and Tacuarembó departments of Uruguay.",
      reviewedSources: {
        guyanaRegionalFlags:
          "https://mlgrd.gov.gy/wp-content/uploads/2016/09/Regional-Flags-of-Guyana_Final-1.pdf",
        indiaStateFlagStatus:
          "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1515008&lang=2&reg=48",
        portugalDistricts:
          "https://portalautarquico.dgal.gov.pt/pt-PT/entidades-locais/distritos/",
      },
      assets: attribution,
    },
    null,
    2,
  )}\n`,
);

console.log(`Bundled ${assets.length} subdivision flags with per-file attribution.`);
