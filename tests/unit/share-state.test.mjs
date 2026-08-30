import assert from "node:assert/strict";
import test from "node:test";
import {
  createShareToken,
  createShareUrl,
  parseShareToken,
} from "../../utils/shareState.mjs";
import {
  normalizeVisitType,
  strongestVisitType,
  visitTypeCountsAtLevel,
} from "../../utils/visitTypes.mjs";

test("share tokens round-trip classifications and presentation preferences", () => {
  const token = createShareToken({
    travelState: {
      selected: ["br"],
      selectedSubdivisions: ["br-sp"],
      countryVisitTypes: { br: "lived" },
      subdivisionVisitTypes: { "br-sp": "passed" },
    },
    preferences: {
      placeGrouping: "all",
      progressMode: "places",
      statisticsVisitType: "lived",
      colorMode: "violet",
      mapTheme: "dark",
    },
  });

  assert.deepEqual(parseShareToken(token), {
    travelState: {
      selected: ["br"],
      selectedSubdivisions: ["br-sp"],
      countryVisitTypes: { br: "lived" },
      subdivisionVisitTypes: { "br-sp": "passed" },
    },
    preferences: {
      placeGrouping: "all",
      progressMode: "places",
      statisticsVisitType: "lived",
      colorMode: "violet",
      mapTheme: "dark",
    },
  });
});

test("share URLs replace existing paths and query strings", () => {
  assert.equal(
    createShareUrl("https://atlas.cpbr.digital/old?x=1#hash", "abc"),
    "https://atlas.cpbr.digital/?map=abc",
  );
});

test("invalid share tokens fail closed", () => {
  assert.equal(parseShareToken("broken"), null);
});

test("visit classifications normalize and summarize predictably", () => {
  assert.equal(normalizeVisitType("unknown"), "visited");
  assert.equal(strongestVisitType(["passed", "lived", "visited"]), "lived");
});

test("statistics visit levels are cumulative", () => {
  assert.equal(visitTypeCountsAtLevel("passed", "passed"), true);
  assert.equal(visitTypeCountsAtLevel("visited", "passed"), true);
  assert.equal(visitTypeCountsAtLevel("lived", "passed"), true);
  assert.equal(visitTypeCountsAtLevel("passed", "visited"), false);
  assert.equal(visitTypeCountsAtLevel("visited", "visited"), true);
  assert.equal(visitTypeCountsAtLevel("lived", "visited"), true);
  assert.equal(visitTypeCountsAtLevel("visited", "lived"), false);
  assert.equal(visitTypeCountsAtLevel("lived", "lived"), true);
});
