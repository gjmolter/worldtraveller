import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import countries from "world-countries";

const sourceUrl = "https://inside.fifa.com/en/about-fifa/associations";
const outputPath = resolve(
  process.argv[2] || "data/fifa-members.json",
);

const normalizeName = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(the|republic|darussalam|pr|dr|ir)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const countryIdByName = new Map();
for (const country of countries) {
  const names = [
    country.name.common,
    country.name.official,
    ...Object.values(country.name.nativeName || {}).flatMap((entry) => [
      entry.common,
      entry.official,
    ]),
  ];
  for (const name of names.filter(Boolean)) {
    countryIdByName.set(normalizeName(name), country.cca2.toLowerCase());
  }
}

// FIFA uses association names and codes rather than ISO country names. These
// explicit mappings cover the genuinely different names plus the four UK home
// associations, which do not have ISO 3166-1 codes of their own.
const countryIdByFifaCode = {
  BAH: "bs",
  BOL: "bo",
  CGO: "cg",
  CHN: "cn",
  CIV: "ci",
  COD: "cd",
  CPV: "cv",
  ENG: "eng",
  GAM: "gm",
  HKG: "hk",
  IRL: "ie",
  IRN: "ir",
  KOR: "kr",
  KGZ: "kg",
  LCA: "lc",
  MAC: "mo",
  NIR: "nir",
  PLE: "ps",
  PRK: "kp",
  SCO: "sco",
  SKN: "kn",
  SWZ: "sz",
  TAH: "pf",
  TAN: "tz",
  TPE: "tw",
  USA: "us",
  VIN: "vc",
  VIR: "vi",
  WAL: "wal",
};

function findAssociations(value, results) {
  if (!value || typeof value !== "object") return;
  if (
    typeof value.name === "string" &&
    typeof value.confederation === "string" &&
    /^\/associations\/[A-Z]{3}$/.test(value.url || "")
  ) {
    results.push({
      name: value.name,
      confederation: value.confederation,
      fifaCode: value.url.split("/").pop(),
    });
  }
  Object.values(value).forEach((child) => findAssociations(child, results));
}

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`FIFA request failed: ${response.status} ${response.statusText}`);
}

const html = await response.text();
const pageDataText = html.match(
  /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
)?.[1];
if (!pageDataText) throw new Error("FIFA page data was not found");

const found = [];
findAssociations(JSON.parse(pageDataText), found);
const unique = [
  ...new Map(found.map((association) => [association.fifaCode, association])).values(),
];
const members = unique
  .map((association) => ({
    ...association,
    countryId:
      countryIdByFifaCode[association.fifaCode] ||
      countryIdByName.get(normalizeName(association.name)),
  }))
  .sort((memberA, memberB) => memberA.name.localeCompare(memberB.name));

const unmatched = members.filter((member) => !member.countryId);
if (unmatched.length) {
  throw new Error(
    `Unmatched FIFA associations: ${unmatched.map((member) => member.name).join(", ")}`,
  );
}
if (members.length !== 211) {
  throw new Error(`Expected 211 FIFA associations, found ${members.length}`);
}
if (new Set(members.map((member) => member.countryId)).size !== members.length) {
  throw new Error("FIFA associations map to duplicate app place IDs");
}

const output = {
  reviewedOn: "2026-08-23",
  sourceUrl,
  members,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${members.length} FIFA member associations to ${outputPath}`);
