import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import countries from "world-countries";

const M49_URL = "https://unstats.un.org/unsd/methodology/m49/";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const definitions = JSON.parse(
  await readFile(resolve(root, "data/category-definitions.json"), "utf8"),
);
const placeNameData = JSON.parse(
  await readFile(resolve(root, "data/place-names.json"), "utf8"),
);

function displayNameFor(country) {
  return (
    placeNameData.displayNames[country.cca2.toLowerCase()] ||
    country.name.common
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function packageContinentId(country) {
  if (country.region === "Africa") return "africa";
  if (country.region === "Asia") return "asia";
  if (country.region === "Europe") return "europe";
  if (country.region === "Oceania") return "oceania";
  if (country.region === "Antarctic") return "antarctica";
  if (country.subregion === "South America") return "south-america";
  if (country.region === "Americas") return "north-america";
  throw new Error(`No package continent for ${country.name.common}`);
}

const response = await fetch(M49_URL);
assert(response.ok, `UN M49 request failed with HTTP ${response.status}`);
const html = await response.text();
const englishTable = html.slice(
  html.indexOf('id="GeoGroupsENG"'),
  html.indexOf('id="CHN_GEO"'),
);
assert(englishTable.length > 0, "Could not find the English UN M49 table");

const rowPattern =
  /<tr data-tt-id="(\d+)"(?: data-tt-parent-id="(\d+)")?>[\s\S]*?<td>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td>/g;
const m49Rows = [...englishTable.matchAll(rowPattern)].map((match) => ({
  id: match[1],
  parentId: match[2],
  name: match[3].trim(),
  iso3: match[5].trim(),
}));
const m49ById = Object.fromEntries(m49Rows.map((row) => [row.id, row]));

function m49ContinentId(row) {
  const ancestors = [];
  let current = row;
  while (current) {
    ancestors.push(current.id);
    current = m49ById[current.parentId];
  }

  if (ancestors.includes("002")) return "africa";
  if (ancestors.includes("142")) return "asia";
  if (ancestors.includes("150")) return "europe";
  if (ancestors.includes("009")) return "oceania";
  if (ancestors.includes("010")) return "antarctica";
  if (ancestors.includes("005")) return "south-america";
  if (ancestors.includes("019")) return "north-america";
  return null;
}

const officialContinents = Object.fromEntries(
  m49Rows
    .filter((row) => row.iso3)
    .map((row) => [row.iso3, m49ContinentId(row)]),
);
assert(
  Object.keys(officialContinents).length === 248,
  `Expected 248 current UN M49 ISO entries, found ${Object.keys(officialContinents).length}`,
);

const baselineDifferences = [];
const missingM49Rows = [];
for (const country of countries.filter((candidate) => candidate.cca2)) {
  const id = country.cca2.toLowerCase();
  const officialContinent = officialContinents[country.cca3];
  if (!officialContinent) {
    missingM49Rows.push(displayNameFor(country));
    assert(
      definitions.continentExceptions[id],
      `${displayNameFor(country)} lacks a standalone M49 row and needs an explicit exception`,
    );
    continue;
  }

  const packageContinent = packageContinentId(country);
  if (officialContinent !== packageContinent) {
    baselineDifferences.push(
      `${displayNameFor(country)}: package ${packageContinent}, M49 ${officialContinent}`,
    );
    assert(
      definitions.continentExceptions[id],
      `${displayNameFor(country)} differs from M49 and needs an explicit exception`,
    );
  }
}

console.log(`Checked ${Object.keys(officialContinents).length} live UN M49 entries.`);
console.log(`Explicit baseline differences (${baselineDifferences.length}):`);
for (const difference of baselineDifferences) console.log(`- ${difference}`);
console.log(`Separately selectable places without standalone M49 rows (${missingM49Rows.length}):`);
for (const place of missingM49Rows) console.log(`- ${place}`);
