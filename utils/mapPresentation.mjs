import {
  countryHighlightColor,
  flagColorEntries,
  getMapPalette,
  getVisitTypeColor,
} from "./mapColors.js";
import { marinePropertyPrefix } from "./maritimeInteraction.mjs";

const mapThemePalettes = {
  paper: {
    background: "#cfdcd8", land: "#e9e3cf", water: "#cfdcd8",
    roads: "#c7bda7", text: "#4a4941", textHalo: "#f4efdf",
    boundaries: { soft: "#c9c1ae", standard: "#aaa18b", strong: "#7f7766" },
  },
  light: {
    background: "#dbe7eb", land: "#f4f3ec", water: "#dbe7eb",
    roads: "#cfd1cf", text: "#353a3b", textHalo: "#fbfbf7",
    boundaries: { soft: "#d2d2ca", standard: "#aaa9a0", strong: "#77786f" },
  },
  dark: {
    background: "#17252b", land: "#273238", water: "#17252b",
    roads: "#465158", text: "#dce3e2", textHalo: "#1b272d",
    boundaries: { soft: "#3c494f", standard: "#5b686e", strong: "#839096" },
  },
};

export function atlasPalette(theme) {
  return mapThemePalettes[theme] || mapThemePalettes.paper;
}

const flagColorMatchCases = Object.fromEntries(
  ["active", "hover", "activeHover", "faint"].map((state) => [
    state,
    flagColorEntries.flatMap(([id]) => [
      id,
      countryHighlightColor(id, state),
    ]),
  ]),
);

export const hiddenMicrostateLabelNames = [
  "Andorra",
  "Åland",
  "Åland Islands",
  "Ceuta",
  "Gibraltar",
  "Hong Kong",
  "Hong Kong SAR China",
  "Liechtenstein",
  "Macao",
  "Macau",
  "Melilla",
  "Monaco",
  "San Marino",
  "Vatican City",
  "Vatican City State",
  "Vatican",
  "Città del Vaticano",
];

export function highlightColor(colorMode, state, property) {
  const palette = getMapPalette(colorMode);
  if (!palette.countryColors) return palette[state];

  const fallback = getMapPalette("green")[state];
  const placeId = ["downcase", ["to-string", ["get", property]]];
  const directMatch = [
    "match",
    placeId,
    ...flagColorMatchCases[state],
    fallback,
  ];
  return [
    "case",
    [
      "in",
      placeId,
      ["literal", flagColorEntries.map(([id]) => id)],
    ],
    directMatch,
    [
      "match",
      ["slice", placeId, 0, 2],
      ...flagColorMatchCases[state],
      fallback,
    ],
  ];
}

export const visitPatternImages = {
  passed: "visit-pattern-passed",
  lived: "visit-pattern-lived",
};

function patternedVisitEntries(visitTypes = {}) {
  return Object.entries(visitTypes).filter(
    ([, visitType]) => Boolean(visitPatternImages[visitType]),
  );
}

export function visitPatternFilter(visitTypes = {}, property) {
  const ids = patternedVisitEntries(visitTypes).map(([id]) =>
    id.toLowerCase());
  return ids.length
    ? [
        "in",
        ["downcase", ["to-string", ["get", property]]],
        ["literal", ids],
      ]
    : ["==", ["get", property], "__no_visit_pattern__"];
}

export function visitPatternMatch(visitTypes = {}, property) {
  const entries = patternedVisitEntries(visitTypes);
  if (!entries.length) return visitPatternImages.passed;
  return [
    "match",
    ["downcase", ["to-string", ["get", property]]],
    ...entries.flatMap(([placeId, visitType]) => [
      placeId.toLowerCase(),
      visitPatternImages[visitType],
    ]),
    visitPatternImages.passed,
  ];
}

export function admin1VisitPatternFilter(
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
) {
  return [
    "any",
    visitPatternFilter(subdivisionVisitTypes, "app_id"),
    visitPatternFilter(countryVisitTypes, "parent_id"),
  ];
}

export function admin1VisitPattern(
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
) {
  const childFilter = visitPatternFilter(subdivisionVisitTypes, "app_id");
  return [
    "case",
    childFilter,
    visitPatternMatch(subdivisionVisitTypes, "app_id"),
    visitPatternMatch(countryVisitTypes, "parent_id"),
  ];
}

export function marineVisitPatternFilter(visitTypes = {}, eezDisplayMode) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  return [
    "any",
    ...[1, 2, 3].map((index) =>
      visitPatternFilter(visitTypes, `${prefix}${index}`)),
  ];
}

export function marineVisitPattern(visitTypes = {}, eezDisplayMode) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  return [
    "case",
    ...[1, 2, 3].flatMap((index) => [
      visitPatternFilter(visitTypes, `${prefix}${index}`),
      visitPatternMatch(visitTypes, `${prefix}${index}`),
    ]),
    visitPatternImages.passed,
  ];
}

export function visitTypeColorMatch(
  colorMode,
  visitTypes = {},
  property,
  state = "active",
  fallback = "visited",
) {
  const entries = Object.entries(visitTypes);
  const fallbackColor = getVisitTypeColor(
    colorMode,
    fallback,
    state,
  );
  if (!entries.length) return fallbackColor;

  return [
    "match",
    ["downcase", ["to-string", ["get", property]]],
    ...entries.flatMap(([placeId, visitType]) => [
      placeId.toLowerCase(),
      getVisitTypeColor(colorMode, visitType, state, placeId),
    ]),
    fallbackColor,
  ];
}

export function blendHoverColor(restingColor, hoverColor, hoverStrength) {
  const strength = Math.min(1, Math.max(0, Number(hoverStrength) || 0));
  if (strength === 0) return restingColor;
  if (strength === 1) return hoverColor;
  return [
    "interpolate",
    ["linear"],
    strength,
    0,
    restingColor,
    1,
    hoverColor,
  ];
}

export function countryFill(
  selected,
  partiallySelected,
  colorMode,
  mapTheme,
  hoverStrength,
  countryVisitTypes = {},
) {
  const selectedCodes = selected.map((code) => code.toUpperCase());
  const partiallySelectedCodes = partiallySelected.map((code) =>
    code.toUpperCase());
  const isSelected = selectedCodes.length
    ? ["in", ["get", "iso_a2"], ["literal", selectedCodes]]
    : false;
  const isPartiallySelected = partiallySelectedCodes.length
    ? ["in", ["get", "iso_a2"], ["literal", partiallySelectedCodes]]
    : false;
  const restingColor = [
    "case",
    isSelected,
    visitTypeColorMatch(
      colorMode,
      countryVisitTypes,
      "iso_a2",
      "active",
    ),
    isPartiallySelected,
    highlightColor(colorMode, "faint", "iso_a2"),
    atlasPalette(mapTheme).land,
  ];
  const hoverColor = [
    "case",
    isSelected,
    visitTypeColorMatch(
      colorMode,
      countryVisitTypes,
      "iso_a2",
      "hover",
    ),
    highlightColor(colorMode, "hover", "iso_a2"),
  ];

  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    blendHoverColor(restingColor, hoverColor, hoverStrength),
    restingColor,
  ];
}

export function subnationalFill(
  selected,
  colorMode,
  mapTheme,
  hoverStrength,
  visitTypes = {},
) {
  const selectedCodes = selected.map((code) => code.toLowerCase());
  const isSelected = selectedCodes.length
    ? [
        "any",
        ["in", ["get", "app_id"], ["literal", selectedCodes]],
        ["in", ["get", "parent_id"], ["literal", selectedCodes]],
      ]
    : false;
  const restingColor = [
    "case",
    isSelected,
    [
      "case",
      ["in", ["get", "app_id"], ["literal", selectedCodes]],
      visitTypeColorMatch(colorMode, visitTypes, "app_id", "active"),
      visitTypeColorMatch(colorMode, visitTypes, "parent_id", "active"),
    ],
    atlasPalette(mapTheme).land,
  ];
  const hoverColor = [
    "case",
    isSelected,
    [
      "case",
      ["in", ["get", "app_id"], ["literal", selectedCodes]],
      visitTypeColorMatch(colorMode, visitTypes, "app_id", "hover"),
      visitTypeColorMatch(colorMode, visitTypes, "parent_id", "hover"),
    ],
    highlightColor(colorMode, "hover", "app_id"),
  ];

  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    blendHoverColor(restingColor, hoverColor, hoverStrength),
    restingColor,
  ];
}

export function countryMarineHoverFill(
  selected,
  colorMode,
  countryVisitTypes = {},
) {
  const selectedCodes = selected.map((code) => code.toUpperCase());
  const isSelected = selectedCodes.length
    ? ["in", ["get", "iso_a2"], ["literal", selectedCodes]]
    : false;
  return [
    "case",
    isSelected,
    visitTypeColorMatch(
      colorMode,
      countryVisitTypes,
      "iso_a2",
      "hover",
    ),
    highlightColor(colorMode, "hover", "iso_a2"),
  ];
}

export function admin1Fill(
  selectedCountries,
  selectedSubdivisions,
  colorMode,
  mapTheme,
  hoverStrength,
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
) {
  const selectedParents = selectedCountries.map((code) => code.toLowerCase());
  const selectedChildren = selectedSubdivisions.map((code) => code.toLowerCase());
  const isParentSelected = selectedParents.length
    ? ["in", ["get", "parent_id"], ["literal", selectedParents]]
    : false;
  const isChildSelected = selectedChildren.length
    ? ["in", ["get", "app_id"], ["literal", selectedChildren]]
    : false;
  const isSelected = ["any", isParentSelected, isChildSelected];
  const selectedColor = [
    "case",
    isChildSelected,
    visitTypeColorMatch(
      colorMode,
      subdivisionVisitTypes,
      "app_id",
      "active",
    ),
    visitTypeColorMatch(
      colorMode,
      countryVisitTypes,
      "parent_id",
      "active",
    ),
  ];
  const selectedHoverColor = [
    "case",
    isChildSelected,
    visitTypeColorMatch(
      colorMode,
      subdivisionVisitTypes,
      "app_id",
      "hover",
    ),
    visitTypeColorMatch(
      colorMode,
      countryVisitTypes,
      "parent_id",
      "hover",
    ),
  ];
  const restingColor = [
    "case",
    isSelected,
    selectedColor,
    atlasPalette(mapTheme).land,
  ];
  const hoverColor = [
    "case",
    isSelected,
    selectedHoverColor,
    highlightColor(colorMode, "hover", "parent_id"),
  ];

  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    blendHoverColor(restingColor, hoverColor, hoverStrength),
    restingColor,
  ];
}

export function admin1ParentHoverFill(
  selectedCountries,
  selectedSubdivisions,
  colorMode,
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
) {
  const selectedParents = selectedCountries.map((code) => code.toLowerCase());
  const selectedChildren = selectedSubdivisions.map((code) => code.toLowerCase());
  const isParentSelected = selectedParents.length
    ? ["in", ["get", "parent_id"], ["literal", selectedParents]]
    : false;
  const isChildSelected = selectedChildren.length
    ? ["in", ["get", "app_id"], ["literal", selectedChildren]]
    : false;

  return [
    "case",
    isChildSelected,
    visitTypeColorMatch(
      colorMode,
      subdivisionVisitTypes,
      "app_id",
      "hover",
    ),
    isParentSelected,
    visitTypeColorMatch(
      colorMode,
      countryVisitTypes,
      "parent_id",
      "hover",
    ),
    highlightColor(colorMode, "hover", "parent_id"),
  ];
}

export function admin1Filter(
  selectedCountries,
  subdivisionMode,
  subdivisionParentIds = [],
  supportedParentIds = [],
) {
  if (subdivisionMode === "off") {
    return ["==", ["get", "app_id"], "__no_subdivisions__"];
  }
  if (subdivisionMode === "all") return ["has", "app_id"];
  if (subdivisionMode === "parents") {
    return subdivisionParentIds.length
      ? ["in", ["get", "parent_id"], ["literal", subdivisionParentIds]]
      : ["==", ["get", "parent_id"], "__no_detailed_parent__"];
  }

  const supportedParents = new Set(supportedParentIds);
  const visibleParents = selectedCountries.filter((code) =>
    supportedParents.has(code.toLowerCase()));
  return visibleParents.length
    ? ["in", ["get", "parent_id"], ["literal", visibleParents]]
    : ["==", ["get", "parent_id"], "__no_visited_parent__"];
}

export function marineColor(
  selected,
  eezDisplayMode,
  colorMode,
  visitTypes = {},
) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  const selectedCodes = selected.map((code) => code.toLowerCase());
  const isSelected = selectedCodes.length
    ? [
        "any",
        ["in", ["get", `${prefix}1`], ["literal", selectedCodes]],
        ["in", ["get", `${prefix}2`], ["literal", selectedCodes]],
        ["in", ["get", `${prefix}3`], ["literal", selectedCodes]],
      ]
    : false;

  return [
    "case",
    isSelected,
    marineVisitColor(visitTypes, eezDisplayMode, colorMode, "hover"),
    highlightColor(colorMode, "hover", `${prefix}1`),
  ];
}

export function marineVisitColor(
  visitTypes = {},
  eezDisplayMode,
  colorMode,
  state = "active",
) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  const selectedCodes = Object.keys(visitTypes).map((code) =>
    code.toLowerCase());
  if (!selectedCodes.length) {
    return getVisitTypeColor(colorMode, "visited", state);
  }

  return [
    "case",
    ...[1, 2, 3].flatMap((index) => [
      [
        "in",
        ["downcase", ["to-string", ["get", `${prefix}${index}`]]],
        ["literal", selectedCodes],
      ],
      visitTypeColorMatch(
        colorMode,
        visitTypes,
        `${prefix}${index}`,
        state,
      ),
    ]),
    getVisitTypeColor(colorMode, "visited", state),
  ];
}
