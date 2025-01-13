import worldData from 'https://cdn.gabrielmolter.com/world.json';

export const worldSVGs = {
  id: worldData.id,
  name: worldData.name,
  viewBox: worldData.viewBox,
  layers: worldData.layers,
};

export const worldJSON = worldData.worldJSON;

export const worldLand = 1360100;
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
export const getCountryById = (id) => {
  return worldJSON.filter((country) => country.id === id)[0];
};
export const getCountryByName = (name) => {
  return worldJSON.filter((country) => country.name === name)[0];
};
