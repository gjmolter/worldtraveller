import territoryAssociations from "../data/territory-associations.json";

export const placeGroupingOptions = [
  {
    id: "all",
    label: "Detailed places",
    description:
      "Track supported states, provinces and regions separately, with a size threshold you control.",
  },
  {
    id: "standard",
    label: "Countries & territories",
    description:
      "Group states, provinces and regions into their parent country, while keeping separately listed territories distinct.",
  },
  {
    id: "sovereign",
    label: "Sovereign states",
    description:
      "Roll subdivisions, constituent countries and administered territories into their highest sovereign state.",
  },
];

const groupByState = Object.fromEntries(
  territoryAssociations.groups.map(({ state, places }) => [
    state,
    [state, ...places],
  ]),
);

const stateByPlace = Object.fromEntries(
  territoryAssociations.groups.flatMap(({ state, places }) =>
    places.map((place) => [place, state]),
  ),
);

export function associatedStateFor(countryId) {
  return stateByPlace[countryId] || countryId;
}

export function associatedPlacesFor(countryId) {
  const stateId = associatedStateFor(countryId);
  return groupByState[stateId] || [stateId];
}

export function displayStateFor(countryId, placeGrouping) {
  return placeGrouping === "sovereign"
    ? associatedStateFor(countryId)
    : countryId;
}

export function normalizeGroupedSelection(countryIds) {
  return [...new Set(countryIds.map(associatedStateFor))];
}

export function expandGroupedSelection(countryIds) {
  return [
    ...new Set(
      normalizeGroupedSelection(countryIds).flatMap(
        (countryId) => groupByState[countryId] || [countryId],
      ),
    ),
  ];
}

export function projectCountrySelection(countryIds, placeGrouping) {
  const rawIds = [...new Set(countryIds)];
  if (placeGrouping !== "sovereign") {
    return {
      displayIds: rawIds,
      mapIds: rawIds,
    };
  }

  return {
    displayIds: normalizeGroupedSelection(rawIds),
    mapIds: expandGroupedSelection(rawIds),
  };
}

export const territoryAssociationsReviewedOn = territoryAssociations.reviewedOn;
