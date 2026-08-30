import countries from "world-countries";
import customPlaceData from "../data/custom-places.json";
import placeNameData from "../data/place-names.json";

const customPlaces = customPlaceData.places;
const separatelyListedSpanishLandArea = customPlaces
  .filter((place) => place.id === "es-ce" || place.id === "es-ml")
  .reduce((total, place) => total + place.land, 0);
const alandLandArea =
  countries.find((country) => country.cca2 === "AX")?.area || 0;

const isoPlaces = countries
  .filter((country) => country.cca2 && country.cca3)
  .map((country) => {
    const id = country.cca2.toLowerCase();
    const name = placeNameData.displayNames[id] || country.name.common;
    const aliases = [
      country.name.common,
      ...(placeNameData.aliases[id] || []),
    ].filter(
      (alias, index, all) => alias !== name && all.indexOf(alias) === index,
    );

    return {
      id,
      name,
      aliases,
      contextualNames: placeNameData.contextualNames[id] || {},
      flagCode: country.cca2.toLowerCase(),
      // Spain's autonomous cities and the UK's constituent countries are
      // exposed separately. Remove their area from the parent entry so land
      // progress cannot double-count them.
      land:
        country.cca2 === "ES"
          ? country.area - separatelyListedSpanishLandArea
          : country.cca2 === "FI"
            ? country.area - alandLandArea
            : country.cca2 === "GB"
              ? 0
              : country.area,
      // The UK remains in organization lists, but map/search selection uses its
      // four constituent-country polygons instead of a duplicate whole-UK row.
      selectable: country.cca2 !== "GB",
      independent: country.independent === true,
      // world-countries currently marks Vatican City as a UN member. The Holy
      // See is a non-member observer state, so keep the app's status accurate.
      unMember: country.unMember === true && country.cca2 !== "VA",
      coordinates:
        country.latlng?.length === 2
          ? [country.latlng[1], country.latlng[0]]
          : null,
      languages: Object.values(country.languages || {}),
    };
  });

export const worldJSON = [...isoPlaces, ...customPlaces].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const countryCodeByAlpha3 = Object.fromEntries(
  countries.map((country) => [country.cca3, country.cca2.toLowerCase()]),
);

const microstateCalloutCodes = new Set([
  "ad",
  "ax",
  "gi",
  "hk",
  "li",
  "mc",
  "mo",
  "sm",
  "va",
]);
const microstateCalloutCoordinateOverrides = {
  // Mariehamn is a stable, visible anchor within Åland's archipelago.
  ax: [19.949, 60.0973],
  // Use the territory itself rather than the broad midpoint coordinates from
  // world-countries for these compact coastal places.
  gi: [-5.3536, 36.1408],
  // Keep Hong Kong selectable without requiring a deep zoom into its dense
  // Pearl River Delta coastline.
  hk: [114.1694, 22.3193],
  // Place Liechtenstein's marker on its capital, Vaduz, rather than the
  // country's midpoint supplied by world-countries.
  li: [9.52242309, 47.13845114],
  mo: [113.5439, 22.1987],
  // world-countries places San Marino roughly 20 km too far south.
  sm: [12.457777, 43.94236],
};

export const microstateCallouts = worldJSON
  .filter(
    (place) =>
      microstateCalloutCodes.has(place.id) || place.calloutMinZoom != null,
  )
  .map((place) => ({
    id: place.id,
    name: place.name,
    coordinates:
      microstateCalloutCoordinateOverrides[place.id] || place.coordinates,
    minZoom: place.calloutMinZoom || 4.25,
  }));

export const worldLand = worldJSON.reduce(
  (total, country) => total + country.land,
  0,
);

const countryById = Object.fromEntries(
  worldJSON.map((country) => [country.id, country]),
);
const countryByName = Object.fromEntries(
  worldJSON.flatMap((country) =>
    [
      country.name,
      ...(country.aliases || []),
      ...Object.values(country.contextualNames || {}),
    ].map((name) => [name.toLocaleLowerCase(), country]),
  ),
);

export const getCountryById = (id) => countryById[id];
export const getCountryByName = (name) =>
  countryByName[String(name || "").toLocaleLowerCase()];
export const getCountryDisplayName = (id, context = "geographic") => {
  const country = getCountryById(id);
  return country?.contextualNames?.[context] || country?.name;
};
