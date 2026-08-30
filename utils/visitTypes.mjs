export const DEFAULT_VISIT_TYPE = "visited";

export const visitTypeOptions = [
  { id: "passed", label: "Passed through", shortLabel: "Passed" },
  { id: "visited", label: "Visited", shortLabel: "Visited" },
  { id: "lived", label: "Lived", shortLabel: "Lived" },
];

const visitTypeIds = new Set(visitTypeOptions.map(({ id }) => id));
const visitTypeRank = { passed: 1, visited: 2, lived: 3 };

export function normalizeVisitType(value) {
  return visitTypeIds.has(value) ? value : DEFAULT_VISIT_TYPE;
}

export function visitTypeLabel(value) {
  const normalized = normalizeVisitType(value);
  return visitTypeOptions.find(({ id }) => id === normalized)?.label ||
    "Visited";
}

export function strongestVisitType(values) {
  return values
    .map(normalizeVisitType)
    .reduce(
      (strongest, value) =>
        visitTypeRank[value] > visitTypeRank[strongest] ? value : strongest,
      "passed",
    );
}

export function visitTypeCountsAtLevel(value, minimumLevel) {
  return visitTypeRank[normalizeVisitType(value)] >=
    visitTypeRank[normalizeVisitType(minimumLevel)];
}
