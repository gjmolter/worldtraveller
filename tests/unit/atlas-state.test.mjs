import assert from "node:assert/strict";
import test from "node:test";
import {
  ATLAS_STATE_VERSION,
  DEFAULT_ATLAS_PREFERENCES,
  migrateLegacyAtlasState,
  normalizeAtlasPreferences,
  parseAtlasState,
  serializeAtlasState,
} from "../../utils/atlasState.mjs";

function memoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("atlas state atomically round-trips travel data and preferences", () => {
  const serialized = serializeAtlasState({
    travelState: {
      selected: ["BR"],
      selectedSubdivisions: ["br-sp"],
      countryVisitTypes: { br: "lived" },
      subdivisionVisitTypes: { "br-sp": "passed" },
    },
    preferences: {
      ...DEFAULT_ATLAS_PREFERENCES,
      placeGrouping: "all",
      eezDisplayMode: "all",
      colorMode: "violet",
      subdivisionAreaThreshold: Number.POSITIVE_INFINITY,
      mapTheme: "dark",
      mapLabelDensity: "reduced",
      hoverOpacity: 65,
      selectionVisitType: "passed",
      statisticsVisitType: "lived",
      progressSidebarOpen: true,
    },
  });

  assert.deepEqual(parseAtlasState(serialized), {
    travelState: {
      selected: ["br"],
      selectedSubdivisions: ["br-sp"],
      countryVisitTypes: { br: "lived" },
      subdivisionVisitTypes: { "br-sp": "passed" },
    },
    preferences: {
      ...DEFAULT_ATLAS_PREFERENCES,
      placeGrouping: "all",
      eezDisplayMode: "all",
      colorMode: "violet",
      subdivisionAreaThreshold: Number.POSITIVE_INFINITY,
      mapTheme: "dark",
      mapLabelDensity: "reduced",
      hoverOpacity: 65,
      selectionVisitType: "passed",
      statisticsVisitType: "lived",
      progressSidebarOpen: true,
    },
  });
  assert.equal(JSON.parse(serialized).version, ATLAS_STATE_VERSION);
  assert.equal(
    JSON.parse(serialized).preferences.subdivisionAreaThreshold,
    "none",
  );
});

test("preference normalization rejects unsupported and out-of-range values", () => {
  assert.deepEqual(normalizeAtlasPreferences({
    placeGrouping: "broken",
    hoverOpacity: 500,
    mapTheme: "neon",
    colorMode: "not-a-theme",
  }), {
    ...DEFAULT_ATLAS_PREFERENCES,
    hoverOpacity: 100,
  });
});

test("legacy keys migrate without modifying their source values", () => {
  const storage = memoryStorage({
    "cpbr-atlas:travel-state": JSON.stringify({
      version: 2,
      countries: ["br", "unknown"],
      subdivisions: ["br-sp"],
      countryTypes: { br: "lived" },
      subdivisionTypes: { "br-sp": "passed" },
    }),
    "cpbr-atlas:place-grouping": "all",
    "cpbr-atlas:progress-mode": "places",
    "cpbr-atlas:eez-display-mode": "all",
    "cpbr-atlas:color-mode": "blue",
    "cpbr-atlas:subdivision-area-threshold": "none",
    "cpbr-atlas:map-theme": "dark",
    "cpbr-atlas:map-label-density": "hidden",
    "cpbr-atlas:hover-opacity": "42",
    "cpbr-atlas:selection-visit-type": "passed",
    "cpbr-atlas:statistics-visit-type": "lived",
    "cpbr-atlas:progress-sidebar-open": "true",
  });

  const migrated = migrateLegacyAtlasState(storage, {
    isValidCountry: (id) => id === "br",
    isValidSubdivision: (id) => id === "br-sp",
  });

  assert.deepEqual(migrated.travelState, {
    selected: ["br"],
    selectedSubdivisions: ["br-sp"],
    countryVisitTypes: { br: "lived" },
    subdivisionVisitTypes: { "br-sp": "passed" },
  });
  assert.deepEqual(migrated.preferences, {
    placeGrouping: "all",
    progressMode: "places",
    eezDisplayMode: "all",
    colorMode: "blue",
    subdivisionAreaThreshold: Number.POSITIVE_INFINITY,
    mapTheme: "dark",
    mapLabelDensity: "hidden",
    hoverOpacity: 42,
    selectionVisitType: "passed",
    statisticsVisitType: "lived",
    progressSidebarOpen: true,
  });
  assert.ok(storage.getItem("cpbr-atlas:travel-state"));
});

test("invalid or unsupported atlas state fails closed", () => {
  assert.equal(parseAtlasState("not-json"), null);
  assert.equal(parseAtlasState(JSON.stringify({ version: 999 })), null);
  assert.equal(parseAtlasState(null), null);
});
