import countries from "world-countries";

export const worldJSON = countries
  .filter((country) => country.cca2 && country.cca3)
  .map((country) => ({
    id: country.cca2.toLowerCase(),
    name: country.name.common,
    flag: country.flag,
    land: country.area,
    coordinates:
      country.latlng?.length === 2
        ? [country.latlng[1], country.latlng[0]]
        : null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const countryCodeByAlpha3 = Object.fromEntries(
  countries.map((country) => [country.cca3, country.cca2.toLowerCase()]),
);

const microstateCalloutCodes = new Set(["ad", "li", "mc", "sm", "va"]);

export const microstateCallouts = countries
  .filter(
    (country) =>
      microstateCalloutCodes.has(country.cca2?.toLowerCase()) &&
      country.latlng?.length === 2,
  )
  .map((country) => ({
    id: country.cca2.toLowerCase(),
    name: country.name.common,
    coordinates: [country.latlng[1], country.latlng[0]],
  }));

export const worldLand = worldJSON.reduce(
  (total, country) => total + country.land,
  0,
);
export const monarchies = [
  "qa",
  "va",
  "om",
  "sa",
  "sz",
  "bn",
  "th",
  "bt",
  "ad",
  "kh",
  "ls",
  "tv",
  "kn",
  "ag",
  "bz",
  "lc",
  "vc",
  "sb",
  "es",
  "pg",
  "gd",
  "se",
  "bs",
  "to",
  "jm",
  "my",
  "dk",
  "jp",
  "nz",
  "au",
  "lu",
  "ca",
  "be",
  "nl",
  "no",
  "gb",
  "ae",
  "bh",
  "kw",
  "jo",
  "mc",
  "li",
  "ma",
];
export const europeanUnion = [
  "at",
  "be",
  "bg",
  "cy",
  "cz",
  "de",
  "dk",
  "ee",
  "es",
  "fi",
  "fr",
  "gr",
  "hr",
  "hu",
  "ie",
  "it",
  "lt",
  "lu",
  "lv",
  "mt",
  "nl",
  "pl",
  "pt",
  "ro",
  "se",
  "si",
  "sk",
];

export const sevenWondersOld = ["eg", "iq", "gr", "tr"];
export const sevenWondersNew = ["cn", "in", "jo", "it", "br", "mx", "pe"];

const countryById = Object.fromEntries(
  worldJSON.map((country) => [country.id, country]),
);
const countryByName = Object.fromEntries(
  worldJSON.map((country) => [country.name, country]),
);

export const getCountryById = (id) => countryById[id];
export const getCountryByName = (name) => countryByName[name];
