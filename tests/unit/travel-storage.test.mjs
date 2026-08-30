import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTravelState,
  serializeTravelState,
  TRAVEL_STATE_VERSION,
} from "../../utils/travelStorage.mjs";

test("travel state round-trips with normalized unique IDs", () => {
  const serialized = serializeTravelState({
    selected: ["BR", "br", " pt "],
    selectedSubdivisions: ["BR-SP", "br-sp", "br-rj"],
    countryVisitTypes: { br: "lived", pt: "passed" },
    subdivisionVisitTypes: { "br-sp": "lived", "br-rj": "visited" },
  });

  assert.deepEqual(parseTravelState(serialized), {
    selected: ["br", "pt"],
    selectedSubdivisions: ["br-sp", "br-rj"],
    countryVisitTypes: { br: "lived", pt: "passed" },
    subdivisionVisitTypes: { "br-sp": "lived", "br-rj": "visited" },
  });
});

test("travel state drops unknown places during hydration", () => {
  const serialized = JSON.stringify({
    version: TRAVEL_STATE_VERSION,
    countries: ["br", "unknown"],
    subdivisions: ["br-sp", "missing"],
  });

  assert.deepEqual(parseTravelState(serialized, {
    isValidCountry: (id) => id === "br",
    isValidSubdivision: (id) => id === "br-sp",
  }), {
    selected: ["br"],
    selectedSubdivisions: ["br-sp"],
    countryVisitTypes: { br: "visited" },
    subdivisionVisitTypes: { "br-sp": "visited" },
  });
});

test("version one selections migrate to Visited", () => {
  assert.deepEqual(parseTravelState(JSON.stringify({
    version: 1,
    countries: ["br"],
    subdivisions: ["br-sp"],
  })), {
    selected: ["br"],
    selectedSubdivisions: ["br-sp"],
    countryVisitTypes: { br: "visited" },
    subdivisionVisitTypes: { "br-sp": "visited" },
  });
});

test("invalid or unsupported travel state fails closed", () => {
  assert.equal(parseTravelState("not-json"), null);
  assert.equal(parseTravelState(JSON.stringify({ version: 999 })), null);
  assert.equal(parseTravelState(null), null);
});
