import { DEFAULT_VISIT_TYPE, normalizeVisitType } from "./visitTypes.mjs";

export const TRAVEL_STATE_STORAGE_KEY = "cpbr-atlas:travel-state";
export const TRAVEL_STATE_VERSION = 2;

function normalizedIds(values, isValid) {
  if (!Array.isArray(values)) return [];
  return [...new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .filter(isValid),
  )];
}

export function parseTravelState(
  serialized,
  { isValidCountry = () => true, isValidSubdivision = () => true } = {},
) {
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized);
    if (![1, TRAVEL_STATE_VERSION].includes(value?.version)) return null;
    const selected = normalizedIds(value.countries, isValidCountry);
    const selectedSubdivisions = normalizedIds(
      value.subdivisions,
      isValidSubdivision,
    );
    const savedCountryTypes = value.version === 1 ? {} : value.countryTypes;
    const savedSubdivisionTypes = value.version === 1
      ? {}
      : value.subdivisionTypes;
    return {
      selected,
      selectedSubdivisions,
      countryVisitTypes: Object.fromEntries(selected.map((id) => [
        id,
        normalizeVisitType(savedCountryTypes?.[id] || DEFAULT_VISIT_TYPE),
      ])),
      subdivisionVisitTypes: Object.fromEntries(
        selectedSubdivisions.map((id) => [
          id,
          normalizeVisitType(
            savedSubdivisionTypes?.[id] || DEFAULT_VISIT_TYPE,
          ),
        ]),
      ),
    };
  } catch {
    return null;
  }
}

export function serializeTravelState({
  selected,
  selectedSubdivisions,
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
}) {
  const countries = normalizedIds(selected, () => true);
  const subdivisions = normalizedIds(selectedSubdivisions, () => true);
  return JSON.stringify({
    version: TRAVEL_STATE_VERSION,
    countries,
    subdivisions,
    countryTypes: Object.fromEntries(countries.map((id) => [
      id,
      normalizeVisitType(countryVisitTypes[id]),
    ])),
    subdivisionTypes: Object.fromEntries(subdivisions.map((id) => [
      id,
      normalizeVisitType(subdivisionVisitTypes[id]),
    ])),
  });
}
