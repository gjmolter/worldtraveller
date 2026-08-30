import assert from "node:assert/strict";
import test from "node:test";
import {
  COUNTRY_LAYER,
  COUNTRY_VISIT_PATTERN_LAYER,
  createLandMapSpecs,
  createMaritimeMapSpecs,
  MARITIME_BASE_LAYER,
  MARITIME_DETAIL_BASE_LAYER,
  MARITIME_DETAIL_HIT_LAYER,
  MARITIME_HIT_LAYER,
  MARITIME_PATTERN_LAYER,
  registerMapSpecs,
} from "../../utils/mapLayerSpecs.mjs";

test("land specs keep country layers below the basemap fill stack", () => {
  const specs = createLandMapSpecs({
    maptilerKey: "test-key",
    selected: ["br"],
    partiallySelected: ["pt"],
    colorMode: "green",
    mapTheme: "paper",
    hoverStrength: 1,
  });

  assert.equal(specs.sources.length, 3);
  assert.equal(specs.layers[0].spec.id, COUNTRY_LAYER);
  assert.ok(specs.layers.every(({ beforeBaseFill }) => beforeBaseFill));
  assert.match(specs.sources[0].spec.url, /key=test-key/);
});

test("land specs add patterns only for non-solid visit classifications", () => {
  const specs = createLandMapSpecs({
    maptilerKey: "test-key",
    selected: ["br", "pt", "us"],
    partiallySelected: [],
    colorMode: "country",
    mapTheme: "paper",
    hoverStrength: 1,
    countryVisitTypes: { br: "passed", pt: "visited", us: "lived" },
  });
  const layers = new Map(specs.layers.map(({ spec }) => [spec.id, spec]));
  const patternLayer = layers.get(COUNTRY_VISIT_PATTERN_LAYER);

  assert.match(JSON.stringify(patternLayer.filter), /br/);
  assert.match(JSON.stringify(patternLayer.filter), /us/);
  assert.doesNotMatch(JSON.stringify(patternLayer.filter), /pt/);
  assert.match(JSON.stringify(patternLayer.paint["fill-pattern"]), /visit-pattern-lived/);
});

test("maritime specs pair overview and detail layers at the same zoom boundary", () => {
  const specs = createMaritimeMapSpecs({
    maritimeSelected: ["br-pe"],
    eezDisplayMode: "aids",
    colorMode: "green",
    hoverStrength: 0.5,
  });
  const layers = new Map(specs.layers.map(({ spec }) => [spec.id, spec]));

  assert.equal(layers.get(MARITIME_HIT_LAYER).maxzoom, 4);
  assert.equal(layers.get(MARITIME_DETAIL_HIT_LAYER).minzoom, 4);
  assert.equal(layers.get(MARITIME_BASE_LAYER).layout.visibility, "visible");
  assert.equal(layers.get(MARITIME_DETAIL_BASE_LAYER).layout.visibility, "visible");
  assert.equal(layers.get(MARITIME_PATTERN_LAYER).layout.visibility, "visible");
});

test("hidden maritime shading retains selection-aid hit layers", () => {
  const specs = createMaritimeMapSpecs({
    maritimeSelected: [],
    eezDisplayMode: "none",
    colorMode: "green",
    hoverStrength: 1,
  });
  const layers = new Map(specs.layers.map(({ spec }) => [spec.id, spec]));

  assert.equal(layers.get(MARITIME_BASE_LAYER).layout.visibility, "none");
  assert.deepEqual(layers.get(MARITIME_HIT_LAYER).filter[1], [
    "==",
    ["get", "selectionAid"],
    true,
  ]);
});

test("registration applies the basemap insertion point only where requested", () => {
  const calls = [];
  const map = {
    addSource: (id, spec) => calls.push(["source", id, spec.type]),
    addLayer: (spec, before) => calls.push(["layer", spec.id, before]),
  };
  registerMapSpecs(map, {
    sources: [{ id: "source-a", spec: { type: "geojson" } }],
    layers: [
      { spec: { id: "below" }, beforeBaseFill: true },
      { spec: { id: "above" } },
    ],
  }, "base-fill");

  assert.deepEqual(calls, [
    ["source", "source-a", "geojson"],
    ["layer", "below", "base-fill"],
    ["layer", "above", undefined],
  ]);
});
