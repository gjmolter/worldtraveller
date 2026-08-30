import {
  parseTravelState,
  serializeTravelState,
} from "./travelStorage.mjs";
import { normalizeVisitType } from "./visitTypes.mjs";

export const ATLAS_STATE_STORAGE_KEY = "cpbr-atlas:state";
export const ATLAS_STATE_VERSION = 1;

export const LEGACY_STORAGE_KEYS = Object.freeze({
  travel: "cpbr-atlas:travel-state",
  placeGrouping: "cpbr-atlas:place-grouping",
  progressMode: "cpbr-atlas:progress-mode",
  eezDisplayMode: "cpbr-atlas:eez-display-mode",
  colorMode: "cpbr-atlas:color-mode",
  subdivisionAreaThreshold: "cpbr-atlas:subdivision-area-threshold",
  mapTheme: "cpbr-atlas:map-theme",
  mapLabelDensity: "cpbr-atlas:map-label-density",
  hoverOpacity: "cpbr-atlas:hover-opacity",
  selectionVisitType: "cpbr-atlas:selection-visit-type",
  statisticsVisitType: "cpbr-atlas:statistics-visit-type",
  progressSidebarOpen: "cpbr-atlas:progress-sidebar-open",
  territoryMode: "cpbr-atlas:territory-mode",
  divisionProgressMode: "cpbr-atlas:division-progress-mode",
  worldTravellerTerritoryMode: "worldtraveller:territory-mode",
  worldTravellerProgressMode: "worldtraveller:progress-mode",
});

export const DEFAULT_ATLAS_PREFERENCES = Object.freeze({
  placeGrouping: "standard",
  progressMode: "land",
  eezDisplayMode: "aids",
  colorMode: "green",
  subdivisionAreaThreshold: 0,
  mapTheme: "paper",
  mapLabelDensity: "full",
  hoverOpacity: 100,
  selectionVisitType: "visited",
  statisticsVisitType: "visited",
  progressSidebarOpen: false,
});

const COLOR_MODES = new Set([
  "green",
  "blue",
  "teal",
  "violet",
  "crimson",
  "terracotta",
  "rose",
  "ochre",
  "country",
]);

function oneOf(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function normalizeSubdivisionAreaThreshold(value) {
  if (value === "none" || value === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : DEFAULT_ATLAS_PREFERENCES.subdivisionAreaThreshold;
}

export function normalizeAtlasPreferences(preferences = {}) {
  const hoverOpacity = Number(preferences.hoverOpacity);
  return {
    placeGrouping: oneOf(
      preferences.placeGrouping,
      ["all", "standard", "sovereign"],
      DEFAULT_ATLAS_PREFERENCES.placeGrouping,
    ),
    progressMode: oneOf(
      preferences.progressMode,
      ["land", "places"],
      DEFAULT_ATLAS_PREFERENCES.progressMode,
    ),
    eezDisplayMode: oneOf(
      preferences.eezDisplayMode,
      ["none", "aids", "all"],
      DEFAULT_ATLAS_PREFERENCES.eezDisplayMode,
    ),
    colorMode: COLOR_MODES.has(preferences.colorMode)
      ? preferences.colorMode
      : DEFAULT_ATLAS_PREFERENCES.colorMode,
    subdivisionAreaThreshold: normalizeSubdivisionAreaThreshold(
      preferences.subdivisionAreaThreshold,
    ),
    mapTheme: oneOf(
      preferences.mapTheme,
      ["paper", "light", "dark"],
      DEFAULT_ATLAS_PREFERENCES.mapTheme,
    ),
    mapLabelDensity: oneOf(
      preferences.mapLabelDensity,
      ["full", "reduced", "hidden"],
      DEFAULT_ATLAS_PREFERENCES.mapLabelDensity,
    ),
    hoverOpacity: preferences.hoverOpacity !== null &&
      preferences.hoverOpacity !== undefined &&
      Number.isFinite(hoverOpacity)
      ? Math.min(100, Math.max(0, hoverOpacity))
      : DEFAULT_ATLAS_PREFERENCES.hoverOpacity,
    selectionVisitType: normalizeVisitType(preferences.selectionVisitType),
    statisticsVisitType: normalizeVisitType(preferences.statisticsVisitType),
    progressSidebarOpen: preferences.progressSidebarOpen === true,
  };
}

export function createDefaultAtlasState() {
  return {
    travelState: {
      selected: [],
      selectedSubdivisions: [],
      countryVisitTypes: {},
      subdivisionVisitTypes: {},
    },
    preferences: { ...DEFAULT_ATLAS_PREFERENCES },
  };
}

export function parseAtlasState(serialized, validation = {}) {
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized);
    if (value?.version !== ATLAS_STATE_VERSION) return null;
    const travelState = parseTravelState(
      JSON.stringify(value.travel),
      validation,
    );
    if (!travelState) return null;
    return {
      travelState,
      preferences: normalizeAtlasPreferences(value.preferences),
    };
  } catch {
    return null;
  }
}

export function serializeAtlasState({ travelState, preferences }) {
  const normalizedPreferences = normalizeAtlasPreferences(preferences);
  return JSON.stringify({
    version: ATLAS_STATE_VERSION,
    travel: JSON.parse(serializeTravelState(travelState)),
    preferences: {
      ...normalizedPreferences,
      subdivisionAreaThreshold: Number.isFinite(
        normalizedPreferences.subdivisionAreaThreshold,
      ) ? normalizedPreferences.subdivisionAreaThreshold : "none",
    },
  });
}

function read(storage, key) {
  return storage.getItem(key);
}

export function migrateLegacyAtlasState(storage, validation = {}) {
  const defaults = createDefaultAtlasState();
  const travelState = parseTravelState(
    read(storage, LEGACY_STORAGE_KEYS.travel),
    validation,
  ) || defaults.travelState;
  const savedGrouping = read(storage, LEGACY_STORAGE_KEYS.placeGrouping);
  const territoryMode = read(storage, LEGACY_STORAGE_KEYS.territoryMode) ||
    read(storage, LEGACY_STORAGE_KEYS.worldTravellerTerritoryMode);
  const divisionProgressMode = read(
    storage,
    LEGACY_STORAGE_KEYS.divisionProgressMode,
  );
  const placeGrouping = ["all", "standard", "sovereign"].includes(
    savedGrouping,
  )
    ? savedGrouping
    : territoryMode === "grouped"
      ? "sovereign"
      : divisionProgressMode === "individual"
        ? "all"
        : "standard";
  const progressMode = read(storage, LEGACY_STORAGE_KEYS.progressMode) ||
    read(storage, LEGACY_STORAGE_KEYS.worldTravellerProgressMode);

  return {
    travelState,
    preferences: normalizeAtlasPreferences({
      placeGrouping,
      progressMode,
      eezDisplayMode: read(storage, LEGACY_STORAGE_KEYS.eezDisplayMode),
      colorMode: read(storage, LEGACY_STORAGE_KEYS.colorMode),
      subdivisionAreaThreshold: read(
        storage,
        LEGACY_STORAGE_KEYS.subdivisionAreaThreshold,
      ),
      mapTheme: read(storage, LEGACY_STORAGE_KEYS.mapTheme),
      mapLabelDensity: read(storage, LEGACY_STORAGE_KEYS.mapLabelDensity),
      hoverOpacity: read(storage, LEGACY_STORAGE_KEYS.hoverOpacity),
      selectionVisitType: read(
        storage,
        LEGACY_STORAGE_KEYS.selectionVisitType,
      ),
      statisticsVisitType: read(
        storage,
        LEGACY_STORAGE_KEYS.statisticsVisitType,
      ),
      progressSidebarOpen:
        read(storage, LEGACY_STORAGE_KEYS.progressSidebarOpen) === "true",
    }),
  };
}
