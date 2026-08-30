import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  closestMarineFeatureToPoint,
  closestPlaceToPoint,
  marineBaseOpacity,
  marineDisplayFilter,
  marineFeatureCodes,
  marineHitFilter,
  marineSelectedFilter,
  resolveMarinePlaces,
} from "../../utils/maritimeInteraction.mjs";

const countries = new Map([
  ["br", { id: "br", name: "Brazil", coordinates: [-51, -10] }],
  ["fj", { id: "fj", name: "Fiji", coordinates: [178.1, -17.7] }],
]);
const subdivisions = new Map([
  ["br-pe", {
    id: "br-pe",
    parentId: "br",
    name: "Pernambuco",
    coordinates: [-37.9, -8.3],
  }],
]);
const subdivisionCandidatesByParent = new Map([
  ["br", [...subdivisions.values()]],
]);

const dependencies = {
  getCountryById: (id) => countries.get(id),
  getSubdivisionById: (id) => subdivisions.get(id),
  subdivisionCandidatesByParent,
};

test("selection-aid mode reads aid codes while all-EEZ mode reads full codes", () => {
  const feature = {
    properties: {
      code1: "br",
      code2: "fj",
      aidCode1: "br-pe",
      aidCode2: "",
    },
  };

  assert.deepEqual(marineFeatureCodes(feature, "aids"), ["br-pe"]);
  assert.deepEqual(marineFeatureCodes(feature, "all"), ["br", "fj"]);
});

test("maritime filters consistently switch between selection aids and all EEZs", () => {
  assert.deepEqual(marineDisplayFilter("aids"), [
    "==",
    ["get", "selectionAid"],
    true,
  ]);
  assert.deepEqual(marineDisplayFilter("all"), ["has", "code1"]);
  assert.equal(marineBaseOpacity("aids"), 0.03);
  assert.equal(marineBaseOpacity("all"), 0.075);
  assert.deepEqual(marineHitFilter("aids"), [
    "all",
    ["==", ["get", "selectionAid"], true],
    ["!=", ["get", "aidCode1"], ""],
    ["!=", ["get", "aidCode1"], "bv"],
  ]);
  assert.deepEqual(marineHitFilter("all"), [
    "all",
    ["!=", ["get", "code1"], ""],
    ["!=", ["get", "code1"], "bv"],
  ]);
});

test("maritime selection filters target the property family for the active mode", () => {
  assert.deepEqual(marineSelectedFilter(["BR-PE"], "aids"), [
    "any",
    ["in", ["get", "aidCode1"], ["literal", ["br-pe"]]],
    ["in", ["get", "aidCode2"], ["literal", ["br-pe"]]],
    ["in", ["get", "aidCode3"], ["literal", ["br-pe"]]],
  ]);
  assert.deepEqual(marineSelectedFilter(["BR"], "all"), [
    "any",
    ["in", ["get", "code1"], ["literal", ["br"]]],
    ["in", ["get", "code2"], ["literal", ["br"]]],
    ["in", ["get", "code3"], ["literal", ["br"]]],
  ]);
});

test("closest maritime feature ignores a false wrapped-map hit", () => {
  const fernandoDeNoronha = {
    type: "Feature",
    properties: { aidCode1: "br-pe" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-32.9, -4.3],
        [-31.9, -4.3],
        [-31.9, -3.3],
        [-32.9, -3.3],
        [-32.9, -4.3],
      ]],
    },
  };
  const bouvet = {
    type: "Feature",
    properties: { aidCode1: "bv" },
    geometry: { type: "Point", coordinates: [3.4, -54.43] },
  };

  assert.equal(
    closestMarineFeatureToPoint(
      [bouvet, fernandoDeNoronha],
      { lng: -32.42, lat: -3.85 },
    ),
    fernandoDeNoronha,
  );
});

test("overlapping compact maritime aids are dissolved before rendering", () => {
  const collection = JSON.parse(readFileSync(
    "public/data/maritime-country-targets.geojson",
    "utf8",
  ));
  const espiritoSanto = collection.features.find(
    ({ properties }) => properties.aidCode1 === "br-es",
  );

  assert.equal(espiritoSanto.geometry.type, "Polygon");
});

test("a subdivision maritime aid resolves to its country when regions are grouped", () => {
  const places = resolveMarinePlaces({
    feature: { properties: { aidCode1: "br-pe" } },
    eezDisplayMode: "aids",
    detailedSubdivisionParentIds: [],
    ...dependencies,
  });

  assert.deepEqual(places, [{
    ...countries.get("br"),
    marineCode: "br-pe",
  }]);
});

test("a subdivision maritime aid resolves to the region in detailed mode", () => {
  const places = resolveMarinePlaces({
    feature: { properties: { aidCode1: "br-pe" } },
    eezDisplayMode: "aids",
    detailedSubdivisionParentIds: ["br"],
    ...dependencies,
  });

  assert.deepEqual(places, [{
    ...subdivisions.get("br-pe"),
    marineCode: "br-pe",
  }]);
});

test("a parent-country maritime area offers its subdivisions in detailed mode", () => {
  const places = resolveMarinePlaces({
    feature: { properties: { code1: "br" } },
    eezDisplayMode: "all",
    detailedSubdivisionParentIds: ["br"],
    ...dependencies,
  });

  assert.deepEqual(places, [...subdivisions.values()]);
});

test("closest-place selection wraps correctly across the international date line", () => {
  const fiji = countries.get("fj");
  const brazil = countries.get("br");

  assert.equal(
    closestPlaceToPoint([brazil, fiji], { lng: -179.5, lat: -17.7 }),
    fiji,
  );
});
