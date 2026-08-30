import assert from "node:assert/strict";
import test from "node:test";
import {
  derivePlaceSelection,
  subdivisionThresholdSteps,
} from "../../utils/placeSelection.mjs";

const countries = new Map([
  ["br", { id: "br", land: 8_358_140 }],
  ["pt", { id: "pt", land: 91_470 }],
  ["gu", { id: "gu", land: 540 }],
  ["us", { id: "us", land: 9_147_420 }],
]);
const subdivisions = [
  { id: "br-a", parentId: "br" },
  { id: "br-b", parentId: "br" },
  { id: "pt-a", parentId: "pt" },
];
const subdivisionById = new Map(subdivisions.map((place) => [place.id, place]));
const dependencies = {
  subdivisions,
  getCountryById: (id) => countries.get(id),
  getSubdivisionById: (id) => subdivisionById.get(id),
  getSubdivisionsForParent: (parentId) =>
    subdivisions.filter((place) => place.parentId === parentId),
  displayStateFor: (id, grouping) =>
    grouping === "sovereign" && id === "gu" ? "us" : id,
  projectCountrySelection: (ids, grouping) =>
    grouping === "sovereign" && ids.includes("us")
      ? [...new Set([...ids, "gu"])]
      : ids,
};

function derive(overrides = {}) {
  return derivePlaceSelection({
    selected: [],
    selectedSubdivisions: [],
    placeGrouping: "all",
    subdivisionAreaThreshold: 0,
    ...dependencies,
    ...overrides,
  });
}

test("subdivision threshold steps are unique, sorted and bounded", () => {
  assert.deepEqual(
    subdivisionThresholdSteps(subdivisions, dependencies.getCountryById),
    [0, 91_470, 8_358_140, Number.POSITIVE_INFINITY],
  );
});

test("a partial detailed selection marks its parent without selecting it", () => {
  const model = derive({ selectedSubdivisions: ["br-a"] });

  assert.deepEqual(model.baseSelected, ["br"]);
  assert.deepEqual(model.fullySelectedCountries, []);
  assert.deepEqual(model.partiallySelectedCountries, ["br"]);
  assert.deepEqual(model.selectedListEntries, [
    { id: "br-a", type: "subdivision" },
  ]);
});

test("selecting a detailed parent expands to all of its subdivisions", () => {
  const model = derive({ selected: ["br"] });

  assert.deepEqual(model.effectiveSelectedSubdivisions, ["br-a", "br-b"]);
  assert.deepEqual(model.fullySelectedCountries, ["br"]);
  assert.deepEqual(model.selectedListEntries, [
    { id: "br-a", type: "subdivision" },
    { id: "br-b", type: "subdivision" },
  ]);
});

test("a threshold-grouped subdivision is represented by its country", () => {
  const model = derive({
    selectedSubdivisions: ["pt-a"],
    subdivisionAreaThreshold: 100_000,
  });

  assert.deepEqual(model.visibleSubdivisionParentIds, ["br"]);
  assert.deepEqual(model.selectedListEntries, [
    { id: "pt", type: "country" },
  ]);
});

test("non-detailed and sovereign modes collapse entries consistently", () => {
  const standard = derive({
    selectedSubdivisions: ["br-a"],
    placeGrouping: "standard",
  });
  assert.deepEqual(standard.selectedListEntries, [
    { id: "br", type: "country" },
  ]);

  const sovereign = derive({
    selected: ["gu"],
    placeGrouping: "sovereign",
  });
  assert.deepEqual(sovereign.selectedListEntries, [
    { id: "us", type: "country" },
  ]);
});
