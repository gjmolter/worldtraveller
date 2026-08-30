import assert from "node:assert/strict";
import test from "node:test";
import {
  admin1Filter,
  atlasPalette,
  blendHoverColor,
  countryFill,
  marineColor,
  marineVisitColor,
  visitPatternFilter,
  visitPatternMatch,
  visitTypeColorMatch,
} from "../../utils/mapPresentation.mjs";
import {
  countryHighlightColor,
  getVisitTypeColor,
} from "../../utils/mapColors.js";

test("unknown map themes fall back to the paper palette", () => {
  assert.deepEqual(atlasPalette("unknown"), atlasPalette("paper"));
  assert.equal(atlasPalette("dark").land, "#273238");
});

test("hover strength preserves the endpoints and interpolates intermediate values", () => {
  assert.equal(blendHoverColor("resting", "hover", 0), "resting");
  assert.equal(blendHoverColor("resting", "hover", 100), "hover");
  assert.deepEqual(blendHoverColor("resting", "hover", 0.5), [
    "interpolate",
    ["linear"],
    0.5,
    0,
    "resting",
    1,
    "hover",
  ]);
});

test("subdivision filters encode each visibility mode explicitly", () => {
  assert.deepEqual(admin1Filter([], "off"), [
    "==",
    ["get", "app_id"],
    "__no_subdivisions__",
  ]);
  assert.deepEqual(admin1Filter([], "all"), ["has", "app_id"]);
  assert.deepEqual(admin1Filter([], "parents", ["br", "us"]), [
    "in",
    ["get", "parent_id"],
    ["literal", ["br", "us"]],
  ]);
  assert.deepEqual(admin1Filter(["br", "pt"], "visited", [], ["br"]), [
    "in",
    ["get", "parent_id"],
    ["literal", ["br"]],
  ]);
});

test("country presentation keeps full and partial selections distinct", () => {
  const expression = JSON.stringify(
    countryFill(["br"], ["pt"], "green", "paper", 1),
  );
  assert.match(expression, /BR/);
  assert.match(expression, /PT/);
  assert.match(expression, /feature-state/);
});

test("travel classifications share the selected theme color", () => {
  const colors = ["passed", "visited", "lived"].map((visitType) =>
    getVisitTypeColor("green", visitType));
  assert.equal(new Set(colors).size, 1);
  assert.deepEqual(colors, ["#4f9a6f", "#4f9a6f", "#4f9a6f"]);
});

test("Flag-led subdivisions inherit their parent country's color", () => {
  assert.equal(
    countryHighlightColor("br-sp"),
    countryHighlightColor("br"),
  );
  assert.equal(
    getVisitTypeColor("country", "visited", "active", "us-ca"),
    countryHighlightColor("us"),
  );
  assert.match(
    JSON.stringify(countryFill([], [], "country", "paper", 1)),
    /slice/,
  );
});

test("passed and lived classifications use distinct map patterns", () => {
  const types = { br: "passed", pt: "visited", us: "lived" };
  const filter = JSON.stringify(visitPatternFilter(types, "iso_a2"));
  const pattern = JSON.stringify(visitPatternMatch(types, "iso_a2"));

  assert.match(filter, /br/);
  assert.match(filter, /us/);
  assert.doesNotMatch(filter, /pt/);
  assert.match(pattern, /visit-pattern-passed/);
  assert.match(pattern, /visit-pattern-lived/);
});

test("map expressions preserve each selected place's visit classification", () => {
  const expression = JSON.stringify(
    visitTypeColorMatch(
      "blue",
      { br: "passed", pt: "lived" },
      "iso_a2",
    ),
  );
  assert.match(expression, /br/);
  assert.match(expression, /pt/);
  assert.match(expression, /#4f83b6/);
});

test("maritime colors use the property family for the active EEZ mode", () => {
  assert.match(JSON.stringify(marineColor(["br-pe"], "aids", "green")), /aidCode1/);
  assert.match(JSON.stringify(marineColor(["br"], "all", "green")), /code1/);
  assert.match(
    JSON.stringify(
      marineVisitColor({ "br-pe": "lived" }, "aids", "green"),
    ),
    /#4f9a6f/,
  );
});
