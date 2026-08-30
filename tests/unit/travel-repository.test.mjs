import assert from "node:assert/strict";
import test from "node:test";
import { createLocalTravelRepository } from "../../utils/travelRepository.mjs";

test("the local repository exposes a stable load/save contract", () => {
  const values = new Map();
  const repository = createLocalTravelRepository({
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  });
  repository.save({
    selected: ["br"],
    selectedSubdivisions: [],
    countryVisitTypes: { br: "lived" },
    subdivisionVisitTypes: {},
  });

  assert.deepEqual(repository.load(), {
    selected: ["br"],
    selectedSubdivisions: [],
    countryVisitTypes: { br: "lived" },
    subdivisionVisitTypes: {},
  });
});
