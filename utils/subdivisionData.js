import subdivisionDefinitions from "../data/subdivisions.json";
import subdivisionExpansion from "../data/subdivision-expansion.json";
import southAmericaSubdivisionExpansion from "../data/subdivision-south-america.json";
import subdivisionLandShares from "../data/subdivision-land-shares.json";

const allSubdivisionDefinitions = {
  reviewedOn: southAmericaSubdivisionExpansion.reviewedOn,
  sources: [
    ...subdivisionDefinitions.sources,
    ...subdivisionExpansion.sources,
    ...southAmericaSubdivisionExpansion.sources,
  ],
  groups: [
    ...subdivisionDefinitions.groups,
    ...subdivisionExpansion.groups,
    ...southAmericaSubdivisionExpansion.groups,
  ],
  places: [
    ...subdivisionDefinitions.places,
    ...subdivisionExpansion.places,
    ...southAmericaSubdivisionExpansion.places,
  ],
};

export const subdivisions = allSubdivisionDefinitions.places.map((subdivision) => ({
  ...subdivision,
  landShare: subdivisionLandShares.shares[subdivision.id] || 0,
}));
export const subdivisionReviewedOn = allSubdivisionDefinitions.reviewedOn;
export const subdivisionSources = allSubdivisionDefinitions.sources;

const subdivisionById = Object.fromEntries(
  subdivisions.map((subdivision) => [subdivision.id, subdivision]),
);

export function getSubdivisionById(id) {
  return subdivisionById[id?.toLowerCase()] || null;
}

const subdivisionsByParent = subdivisions.reduce((byParent, subdivision) => {
  const siblings = byParent.get(subdivision.parentId) || [];
  byParent.set(subdivision.parentId, [...siblings, subdivision]);
  return byParent;
}, new Map());

export function getSubdivisionsForParent(parentId) {
  return subdivisionsByParent.get(parentId?.toLowerCase()) || [];
}

export const subdivisionGroupSections = [
  {
    label: "Subdivisions",
    groups: allSubdivisionDefinitions.groups.map((group) => ({
      ...group,
      memberType: "subdivision",
      subdivisions: subdivisions
        .filter((subdivision) => subdivision.groupId === group.id)
        .map((subdivision) => subdivision.id),
      sources: allSubdivisionDefinitions.sources.filter(
        (source) => source.id === group.sourceId,
      ),
    })),
  },
];

export const subdivisionGroupDefinitions = subdivisionGroupSections.flatMap(
  (section) => section.groups,
);
