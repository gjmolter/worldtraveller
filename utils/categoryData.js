import countries from "world-countries";
import categoryDefinitions from "../data/category-definitions.json";
import customPlaceData from "../data/custom-places.json";
import fifaMemberData from "../data/fifa-members.json";

const customPlaces = customPlaceData.places;
const geographicCustomPlaces = customPlaces.filter((place) =>
  place.categoryIds?.includes("land"),
);

const sourceById = Object.fromEntries(
  categoryDefinitions.sources.map((source) => [source.id, source]),
);

function baselineContinentId(country) {
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
  const id = country.cca2.toLowerCase();
  return (
    categoryDefinitions.continentExceptions[id]?.continents || [
      baselineContinentId(country),
    ]
  );
}

const countryCodesFor = (continentId) => [
  ...countries
    .filter(
      (country) =>
        country.cca2 &&
        country.cca2 !== "GB" &&
        continentIdsFor(country).includes(continentId),
    )
    .map((country) => country.cca2.toLowerCase()),
  ...geographicCustomPlaces
    .filter((place) => place.categoryIds.includes(continentId))
    .map((place) => place.id),
];

const officialLanguageCountryIds = (language) => [
  ...countries
    .filter(
      (country) =>
        country.cca2 &&
        country.cca2 !== "GB" &&
        Object.values(country.languages || {}).includes(language),
    )
    .map((country) => country.cca2.toLowerCase()),
  ...geographicCustomPlaces
    .filter((place) => place.languages?.includes(language))
    .map((place) => place.id),
];

export const africa = countryCodesFor("africa");
export const asia = countryCodesFor("asia");
export const europe = countryCodesFor("europe");
export const northAmerica = countryCodesFor("north-america");
export const southAmerica = countryCodesFor("south-america");
export const oceania = countryCodesFor("oceania");
export const antarctica = countryCodesFor("antarctica");
export const unMembers = countries
  .filter(
    (country) =>
      country.cca2 && country.unMember === true && country.cca2 !== "VA",
  )
  .map((country) => country.cca2.toLowerCase());
export const fifaMembers = fifaMemberData.members.map(
  (member) => member.countryId,
);
export const worldPlaces = [
  ...countries
    .filter((country) => country.cca2 && country.cca2 !== "GB")
    .map((country) => country.cca2.toLowerCase()),
  ...geographicCustomPlaces.map((place) => place.id),
];

export const categoryCountryIds = {
  africa,
  asia,
  europe,
  northAmerica,
  southAmerica,
  oceania,
  antarctica,
  unMembers,
  fifaMembers,
  worldPlaces,
  anglophone: officialLanguageCountryIds("English"),
  francophone: officialLanguageCountryIds("French"),
  hispanophone: officialLanguageCountryIds("Spanish"),
  lusophone: officialLanguageCountryIds("Portuguese"),
  arabophone: officialLanguageCountryIds("Arabic"),
  germanSpeaking: officialLanguageCountryIds("German"),
  dutchSpeaking: officialLanguageCountryIds("Dutch"),
  russianSpeaking: officialLanguageCountryIds("Russian"),
  ...categoryDefinitions.memberships,
};

export const categorySources = categoryDefinitions.sources;
export const categoryReviewedOn = categoryDefinitions.reviewedOn;

export const groupSections = categoryDefinitions.sections.map((section) => ({
  ...section,
  groups: section.groups.map((group) => ({
    ...group,
    countries: group.membershipKey
      ? categoryCountryIds[group.membershipKey]
      : undefined,
    memberNames:
      group.membershipKey === "fifaMembers"
        ? Object.fromEntries(
            fifaMemberData.members.map((member) => [
              member.countryId,
              member.name,
            ]),
          )
        : undefined,
    sources: (group.sourceIds || []).map((sourceId) => sourceById[sourceId]),
  })),
}));

export const groupDefinitions = groupSections.flatMap(
  (section) => section.groups,
);
