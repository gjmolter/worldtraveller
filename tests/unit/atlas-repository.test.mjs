import assert from "node:assert/strict";
import test from "node:test";
import {
  ATLAS_STATE_STORAGE_KEY,
  DEFAULT_ATLAS_PREFERENCES,
} from "../../utils/atlasState.mjs";
import { createLocalAtlasRepository } from "../../utils/atlasRepository.mjs";

function memoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  const writes = [];
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes.push({ key, value });
      values.set(key, value);
    },
    values,
    writes,
  };
}

test("the repository migrates legacy data into one versioned record", () => {
  const storage = memoryStorage({
    "cpbr-atlas:travel-state": JSON.stringify({
      version: 2,
      countries: ["pt"],
      subdivisions: [],
      countryTypes: { pt: "visited" },
      subdivisionTypes: {},
    }),
    "cpbr-atlas:map-theme": "dark",
  });

  const state = createLocalAtlasRepository(storage).load();

  assert.deepEqual(state.travelState.selected, ["pt"]);
  assert.equal(state.preferences.mapTheme, "dark");
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.writes[0].key, ATLAS_STATE_STORAGE_KEY);
});

test("the repository saves a complete state with one atomic write", () => {
  const storage = memoryStorage();
  const repository = createLocalAtlasRepository(storage);
  repository.save({
    travelState: {
      selected: ["br"],
      selectedSubdivisions: [],
      countryVisitTypes: { br: "lived" },
      subdivisionVisitTypes: {},
    },
    preferences: {
      ...DEFAULT_ATLAS_PREFERENCES,
      colorMode: "country",
    },
  });

  assert.equal(storage.writes.length, 1);
  assert.equal(storage.writes[0].key, ATLAS_STATE_STORAGE_KEY);
  assert.deepEqual(repository.load().travelState.selected, ["br"]);
  assert.equal(repository.load().preferences.colorMode, "country");
  assert.equal(storage.writes.length, 1);
});
