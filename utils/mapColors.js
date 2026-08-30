import flagHighlightColors from "../data/flag-highlight-colors.json" with {
  type: "json",
};

export const mapColorOptions = [
  { id: "green", label: "Forest", active: "#4f9a6f", hover: "#8fc9a7", activeHover: "#276944", faint: "#dce2cc" },
  { id: "blue", label: "Ocean", active: "#4f83b6", hover: "#98bddc", activeHover: "#285579", faint: "#dce5ed" },
  { id: "teal", label: "Lagoon", active: "#438f8a", hover: "#91c8c3", activeHover: "#255e5a", faint: "#d5e5e2" },
  { id: "violet", label: "Lavender", active: "#8068a3", hover: "#bcaed0", activeHover: "#503c70", faint: "#e3ddec" },
  { id: "crimson", label: "Ember", active: "#ad5b58", hover: "#d8a19d", activeHover: "#713634", faint: "#ebdad5" },
  { id: "terracotta", label: "Clay", active: "#bd7342", hover: "#dfa77f", activeHover: "#7c4728", faint: "#ecdcca" },
  { id: "rose", label: "Blossom", active: "#ad6e88", hover: "#d7a9bc", activeHover: "#704359", faint: "#eadbe0" },
  { id: "ochre", label: "Harvest", active: "#aa8a3e", hover: "#d4c17c", activeHover: "#6d5725", faint: "#e9e1c6" },
  { id: "country", label: "Flag-led", countryColors: true },
];

const paletteById = Object.fromEntries(
  mapColorOptions.map((palette) => [palette.id, palette]),
);

export function getMapPalette(id) {
  return paletteById[id] || paletteById.green;
}

function mix(hex, targetHex, amount) {
  const source = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );
  const target = [1, 3, 5].map((index) =>
    Number.parseInt(targetHex.slice(index, index + 2), 16),
  );
  return `#${source
    .map((channel, index) =>
      Math.round(channel + (target[index] - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function countryHighlightColor(placeId, state = "active") {
  const normalizedId = placeId?.toLowerCase();
  const parentId = normalizedId?.includes("-")
    ? normalizedId.split("-", 1)[0]
    : normalizedId;
  const active = flagHighlightColors.colors[normalizedId] ||
    flagHighlightColors.colors[parentId] ||
    "#4f7f66";
  if (state === "hover") return mix(active, "#ffffff", 0.48);
  if (state === "activeHover") return mix(active, "#111111", 0.28);
  if (state === "faint") return mix(active, "#f1ecdc", 0.72);
  return active;
}

export function getVisitTypeColor(
  colorMode,
  _visitType = "visited",
  state = "active",
  placeId,
) {
  const palette = getMapPalette(colorMode);
  const paletteState = state === "hover" ? "activeHover" : "active";
  return palette.countryColors
    ? countryHighlightColor(placeId, paletteState)
    : palette[paletteState];
}

export const flagColorEntries = Object.entries(flagHighlightColors.colors);
