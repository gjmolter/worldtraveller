import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import countries from "world-countries";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const definitions = JSON.parse(
  await readFile(resolve(root, "data/category-definitions.json"), "utf8"),
);
const territoryAssociations = JSON.parse(
  await readFile(resolve(root, "data/territory-associations.json"), "utf8"),
);
const customPlaceData = JSON.parse(
  await readFile(resolve(root, "data/custom-places.json"), "utf8"),
);
const fifaMemberData = JSON.parse(
  await readFile(resolve(root, "data/fifa-members.json"), "utf8"),
);
const placeNameData = JSON.parse(
  await readFile(resolve(root, "data/place-names.json"), "utf8"),
);

const selectableCountries = countries
  .filter((country) => country.cca2 && country.cca3)
  .map((country) => {
    const id = country.cca2.toLowerCase();
    return {
      ...country,
      id,
      name: {
        ...country.name,
        common: placeNameData.displayNames[id] || country.name.common,
      },
    };
  })
  .sort((countryA, countryB) =>
    countryA.name.common.localeCompare(countryB.name.common),
  );
const customPlaces = customPlaceData.places.map((place) => ({
  ...place,
  name: { common: place.name },
  code: place.id.toUpperCase(),
}));
const selectablePlaces = [...selectableCountries, ...customPlaces].sort(
  (placeA, placeB) => placeA.name.common.localeCompare(placeB.name.common),
);

function baselineContinentIdFor(country) {
  if (country.region === "Africa") return "africa";
  if (country.region === "Asia") return "asia";
  if (country.region === "Europe") return "europe";
  if (country.region === "Oceania") return "oceania";
  if (country.region === "Antarctic") return "antarctica";
  if (country.subregion === "South America") return "south-america";
  if (country.region === "Americas") return "north-america";
  throw new Error(`No continent assignment for ${country.name.common}`);
}

function continentIdsFor(country) {
  return (
    definitions.continentExceptions[country.id]?.continents || [
      baselineContinentIdFor(country),
    ]
  );
}

const categoryColumns = definitions.sections
  .flatMap((section) => section.groups)
  .map((group) => ({
    id: group.id,
    label: group.label,
    membershipKey: group.membershipKey,
  }));
const categoryById = Object.fromEntries(
  categoryColumns.map((category) => [category.id, category]),
);
const memberships = Object.fromEntries(
  Object.entries(definitions.memberships).map(([key, ids]) => [key, new Set(ids)]),
);
const geographicCustomPlaces = customPlaces.filter((place) =>
  place.categoryIds?.includes("land"),
);
memberships.worldPlaces = new Set([
  ...selectableCountries
    .filter((country) => country.id !== "gb")
    .map((country) => country.id),
  ...geographicCustomPlaces.map((place) => place.id),
]);
const addLanguageMembership = (key, language) => {
  memberships[key] = new Set([
    ...selectableCountries
      .filter(
        (country) =>
          country.id !== "gb" &&
          Object.values(country.languages || {}).includes(language),
      )
      .map((country) => country.id),
    ...geographicCustomPlaces
      .filter((place) => place.languages?.includes(language))
      .map((place) => place.id),
  ]);
};
addLanguageMembership("anglophone", "English");
addLanguageMembership("francophone", "French");
addLanguageMembership("hispanophone", "Spanish");
addLanguageMembership("lusophone", "Portuguese");
addLanguageMembership("arabophone", "Arabic");
addLanguageMembership("germanSpeaking", "German");
addLanguageMembership("dutchSpeaking", "Dutch");
addLanguageMembership("russianSpeaking", "Russian");
memberships.unMembers = new Set(
  selectableCountries
    .filter((country) => country.unMember && country.cca2 !== "VA")
    .map((country) => country.id),
);
memberships.fifaMembers = new Set(
  fifaMemberData.members.map((member) => member.countryId),
);

function categoryIdsFor(place) {
  const categoryIds =
    place.categoryIds ||
    (place.id === "gb" ? [] : ["land", ...continentIdsFor(place)]);
  for (const category of categoryColumns) {
    if (
      category.membershipKey &&
      memberships[category.membershipKey]?.has(place.id)
    ) {
      categoryIds.push(category.id);
    }
  }
  return [...new Set(categoryIds)];
}

function entityType(country) {
  if (country.entityType) return country.entityType;
  if (country.unMember && country.cca2 !== "VA") return "UN member";
  if (country.independent) return "Other independent state";
  return "Territory / area";
}

const rows = selectablePlaces.map((country) => {
  const categoryIds = categoryIdsFor(country);
  return {
    name: country.name.common,
    iso2: country.cca2 || country.code,
    id: country.id,
    type: entityType(country),
    categoryIds,
    categories: categoryIds.map((id) => categoryById[id].label),
  };
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(rows.length === 256, `Expected 256 app places, found ${rows.length}`);
assert(
  new Set(rows.map((row) => row.id)).size === rows.length,
  "Duplicate app place ID in selectable places",
);
assert(
  fifaMemberData.members.length === 211,
  `Expected 211 FIFA member associations, found ${fifaMemberData.members.length}`,
);
assert(
  new Set(fifaMemberData.members.map((member) => member.fifaCode)).size === 211,
  "FIFA member data contains duplicate association codes",
);
assert(
  new Set(fifaMemberData.members.map((member) => member.countryId)).size === 211,
  "FIFA member data contains duplicate app place IDs",
);

const continentIds = new Set([
  "africa",
  "asia",
  "europe",
  "north-america",
  "south-america",
  "oceania",
  "antarctica",
]);
for (const row of rows) {
  if (row.categoryIds.includes("land")) {
    assert(
      row.categoryIds.filter((id) => continentIds.has(id)).length >= 1,
      `${row.name} must have at least one continent category`,
    );
  }
}

const expectedCounts = {
  land: 255,
  africa: 62,
  asia: 51,
  europe: 60,
  "north-america": 42,
  "south-america": 14,
  oceania: 29,
  antarctica: 5,
  un: 193,
  fifa: 211,
  eu: 27,
  g20: 19,
  asean: 11,
  "african-union": 55,
  mercosur: 5,
  monarchies: 43,
  anglophone: 94,
  francophone: 46,
  hispanophone: 26,
  lusophone: 10,
  arabophone: 25,
  "german-speaking": 5,
  "dutch-speaking": 7,
  "russian-speaking": 8,
  "7old": 4,
  "7new": 7,
};

for (const [categoryId, expectedCount] of Object.entries(expectedCounts)) {
  const actualCount = rows.filter((row) => row.categoryIds.includes(categoryId)).length;
  assert(
    actualCount === expectedCount,
    `${categoryById[categoryId].label}: expected ${expectedCount}, found ${actualCount}`,
  );
}

for (const [membershipKey, idSet] of Object.entries(memberships)) {
  const ids = [...idSet];
  assert(
    new Set(ids).size === ids.length,
    `${membershipKey} contains duplicate country codes`,
  );
  for (const id of ids) {
    assert(
      selectablePlaces.some((country) => country.id === id),
      `${membershipKey} contains unknown country code ${id}`,
    );
  }
}

const associatedPlaceIds = territoryAssociations.groups.flatMap(
  ({ places }) => places,
);
assert(
  new Set(associatedPlaceIds).size === associatedPlaceIds.length,
  "Territory associations contain duplicate place codes",
);
assert(
  associatedPlaceIds.length === 55,
  `Expected 55 administered or constituent places, found ${associatedPlaceIds.length}`,
);
assert(
  !associatedPlaceIds.includes("ck") && !associatedPlaceIds.includes("nu"),
  "Cook Islands and Niue are self-governing free-association states, not administered New Zealand places",
);
assert(
  associatedPlaceIds.includes("tk"),
  "Tokelau must remain associated with New Zealand",
);
for (const { state, places } of territoryAssociations.groups) {
  assert(
    selectablePlaces.some((country) => country.id === state),
    `Territory associations contain unknown state code ${state}`,
  );
  assert(!places.includes(state), `${state} cannot be associated with itself`);
  for (const place of places) {
    assert(
      selectablePlaces.some((country) => country.id === place),
      `Territory associations contain unknown place code ${place}`,
    );
  }
}
const intentionallyUngroupedPlaceIds = [
  "aq",
  "ck",
  "eh",
  "nu",
  "ps",
  "tw",
  "xk",
];
const ungroupedNonSovereignPlaceIds = selectablePlaces
  .filter(
    (country) =>
      !country.independent &&
      !country.unMember &&
      !associatedPlaceIds.includes(country.id),
  )
  .map((country) => country.id)
  .sort();
assert(
  JSON.stringify(ungroupedNonSovereignPlaceIds) ===
    JSON.stringify(intentionallyUngroupedPlaceIds),
  `Review ungrouped non-sovereign places: ${ungroupedNonSovereignPlaceIds.join(", ")}`,
);

const sourceIds = new Set(definitions.sources.map((source) => source.id));
assert(
  sourceIds.size === definitions.sources.length,
  "Source definitions contain duplicate IDs",
);
for (const [id, exception] of Object.entries(definitions.continentExceptions)) {
  assert(
    selectableCountries.some((country) => country.id === id),
    `Continent exception contains unknown country code ${id}`,
  );
  assert(
    exception.continents.length >= 1 &&
      new Set(exception.continents).size === exception.continents.length,
    `Continent exception ${id} must have one or more unique continents`,
  );
  for (const continentId of exception.continents) {
    assert(
      continentIds.has(continentId),
      `Continent exception ${id} contains unknown continent ${continentId}`,
    );
  }
  for (const sourceId of exception.sourceIds) {
    assert(
      sourceIds.has(sourceId),
      `Continent exception ${id} contains unknown source ${sourceId}`,
    );
  }
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csvHeaders = [
  "Place",
  "Country code",
  "Entity type",
  ...categoryColumns.map((category) => category.label),
  "Categories",
];
const csvRows = rows.map((row) => [
  row.name,
  row.iso2,
  row.type,
  ...categoryColumns.map((category) =>
    row.categoryIds.includes(category.id) ? "Yes" : "",
  ),
  row.categories.join("; "),
]);
const csv = [csvHeaders, ...csvRows]
  .map((row) => row.map(csvCell).join(","))
  .join("\n");

const countRows = categoryColumns.map((category) => {
  const count = rows.filter((row) => row.categoryIds.includes(category.id)).length;
  return `| ${category.label} | ${count} |`;
});
const countryRows = rows.map(
  (row) =>
    `| ${row.name.replaceAll("|", "\\|")} | ${row.iso2} | ${row.type} | ${row.categories.join(", ")} |`,
);
const sourceRows = definitions.sources.map(
  (source) =>
    `| [${source.label}](${source.url}) | ${source.dateLabel} | ${source.detail.replaceAll("|", "\\|")} |`,
);
const exceptionRows = Object.entries(definitions.continentExceptions)
  .map(([id, exception]) => {
    const country = selectableCountries.find((candidate) => candidate.id === id);
    const continentLabels = exception.continents
      .map((continentId) => categoryById[continentId].label)
      .join(", ");
    const links = exception.sourceIds
      .map((sourceId) => {
        const source = definitions.sources.find((item) => item.id === sourceId);
        return `[${source.label}](${source.url})`;
      })
      .join("; ");
    return `| ${country.name.common.replaceAll("|", "\\|")} | ${continentLabels} | ${exception.reason.replaceAll("|", "\\|")} | ${links} |`;
  })
  .join("\n");

const markdown = `# Country and category audit

Generated from the exact data used by CPBR Atlas. Category memberships were reviewed on **${definitions.reviewedOn}**.

The app data contains **the 249 ISO 3166-1 countries and areas plus Kosovo under the widely used user-assigned code XK**, along with Ceuta, Melilla and the four separately selectable UK constituent countries. The UK parent row remains available for sovereign-state organization memberships but is replaced by its constituent countries in geographic progress and map selection. This includes territories, dependencies and organization-specific entries; it is not a claim that all ${rows.length} entries are sovereign states. The CSV beside this file contains a full Yes/blank matrix for easier filtering.

Continent categories use UN M49 as a repeatable baseline, but not as an exclusive physical-geography authority. M49 is designed for statistics and intentionally shows each country or area in one region only. CPBR Atlas therefore allows a place in more than one continent when official sources establish a genuine continental overlap. Separately coded territories are classified independently from their administering country. “Antarctica & Subantarctic” is a travel grouping: inclusion does not claim that every subantarctic island is part of the Antarctic continent.

## Category counts

| Category | Places |
| --- | ---: |
${countRows.join("\n")}

## Continent exceptions and overlaps

| Place | Continent categories | Reason | Official source |
| --- | --- | --- | --- |
${exceptionRows}

## Complete table

| Place | ISO | Entity type | Categories |
| --- | --- | --- | --- |
${countryRows.join("\n")}

## Sources and review dates

| Source | Date | Used for |
| --- | --- | --- |
${sourceRows.join("\n")}
`;

const docsDirectory = resolve(root, "docs");
await mkdir(docsDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(docsDirectory, "country-category-audit.csv"), `${csv}\n`),
  writeFile(resolve(docsDirectory, "country-category-audit.md"), markdown),
]);

console.log(`Verified ${rows.length} places and ${categoryColumns.length} categories.`);
console.log("Wrote docs/country-category-audit.csv and docs/country-category-audit.md");
