import {
  marineBaseOpacity,
  marineDisplayFilter,
  marineHitFilter,
  marinePropertyPrefix,
  marineSelectedFilter,
} from "./maritimeInteraction.mjs";
import {
  admin1VisitPattern,
  admin1VisitPatternFilter,
  atlasPalette,
  countryFill,
  countryMarineHoverFill,
  highlightColor,
  marineColor,
  marineVisitPattern,
  marineVisitPatternFilter,
  marineVisitColor,
  subnationalFill,
  visitPatternFilter,
  visitPatternMatch,
} from "./mapPresentation.mjs";

export const COUNTRY_SOURCE = "maptiler-countries";
export const COUNTRY_SOURCE_LAYER = "administrative";
export const COUNTRY_LAYER = "country-fill";
export const PALESTINE_SOURCE = "palestine-country";
export const PALESTINE_LAYER = "palestine-country-fill";
export const COUNTRY_MARINE_HOVER_LAYER = "country-marine-hover-fill";
export const COUNTRY_VISIT_PATTERN_LAYER = "country-visit-pattern";
export const PALESTINE_VISIT_PATTERN_LAYER = "palestine-visit-pattern";
export const SUBNATIONAL_VISIT_PATTERN_LAYER = "subnational-visit-pattern";
export const COUNTRY_INTERACTION_LAYERS = [COUNTRY_LAYER, PALESTINE_LAYER];
export const SUBNATIONAL_SOURCE = "subnational-places";
export const SUBNATIONAL_LAYER = "subnational-place-fill";
export const MARITIME_SOURCE = "maritime-country-targets";
export const MARITIME_OVERVIEW_SOURCE = "maritime-country-targets-overview";
export const MARITIME_HIT_LAYER = "maritime-country-hit-area";
export const MARITIME_DETAIL_HIT_LAYER = "maritime-country-hit-area-detail";
export const BOUVET_HIT_SOURCE = "bouvet-hit-target";
export const BOUVET_MARITIME_HIT_LAYER = "bouvet-maritime-hit-area";
export const MARITIME_BASE_LAYER = "maritime-country-base";
export const MARITIME_DETAIL_BASE_LAYER = "maritime-country-base-detail";
export const MARITIME_ACTIVE_LAYER = "maritime-country-active";
export const MARITIME_DETAIL_ACTIVE_LAYER = "maritime-country-active-detail";
export const MARITIME_PATTERN_LAYER = "maritime-country-pattern";
export const MARITIME_DETAIL_PATTERN_LAYER = "maritime-country-pattern-detail";
export const MARITIME_HOVER_LAYER = "maritime-country-hover";
export const MARITIME_DETAIL_HOVER_LAYER = "maritime-country-hover-detail";
export const MARITIME_DETAIL_ZOOM = 4;

export const NO_MARITIME_HOVER_FILTER = [
  "==",
  ["get", "code1"],
  "__no_maritime_hover__",
];
export const NO_COUNTRY_MARINE_HOVER_FILTER = [
  "==",
  ["get", "iso_a2"],
  "__no_country_marine_hover__",
];

export function createLandMapSpecs({
  maptilerKey,
  selected,
  partiallySelected,
  colorMode,
  mapTheme,
  hoverStrength,
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
}) {
  const boundaryColor = atlasPalette(mapTheme).boundaries.soft;
  const countryBaseFilter = [
    "all",
    ["==", ["get", "level"], 0],
    ["has", "iso_a2"],
    ["!=", ["get", "iso_a2"], "GB"],
  ];
  const placeVisitTypes = {
    ...countryVisitTypes,
    ...subdivisionVisitTypes,
  };
  return {
    sources: [
      {
        id: COUNTRY_SOURCE,
        spec: {
          type: "vector",
          url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${maptilerKey}`,
          promoteId: { [COUNTRY_SOURCE_LAYER]: "iso_a2" },
        },
      },
      {
        id: PALESTINE_SOURCE,
        spec: {
          type: "geojson",
          data: "/data/palestine-country.geojson",
          promoteId: "iso_a2",
        },
      },
      {
        id: SUBNATIONAL_SOURCE,
        spec: {
          type: "geojson",
          data: "/data/subnational-places.geojson",
          promoteId: "app_id",
          attribution:
            '<a href="https://geoportal.statistics.gov.uk/" target="_blank">UK ONS Geography</a>',
        },
      },
    ],
    layers: [
      {
        beforeBaseFill: true,
        spec: {
          id: COUNTRY_LAYER,
          type: "fill",
          source: COUNTRY_SOURCE,
          "source-layer": COUNTRY_SOURCE_LAYER,
          filter: countryBaseFilter,
          paint: {
            "fill-color": countryFill(
              selected,
              partiallySelected,
              colorMode,
              mapTheme,
              hoverStrength,
              countryVisitTypes,
            ),
            "fill-outline-color": boundaryColor,
          },
        },
      },
      {
        beforeBaseFill: true,
        spec: {
          id: COUNTRY_VISIT_PATTERN_LAYER,
          type: "fill",
          source: COUNTRY_SOURCE,
          "source-layer": COUNTRY_SOURCE_LAYER,
          filter: [
            "all",
            countryBaseFilter,
            visitPatternFilter(countryVisitTypes, "iso_a2"),
          ],
          paint: {
            "fill-pattern": visitPatternMatch(countryVisitTypes, "iso_a2"),
            "fill-opacity": 0.55,
            "fill-antialias": false,
          },
        },
      },
      {
        beforeBaseFill: true,
        spec: {
          id: COUNTRY_MARINE_HOVER_LAYER,
          type: "fill",
          source: COUNTRY_SOURCE,
          "source-layer": COUNTRY_SOURCE_LAYER,
          filter: NO_COUNTRY_MARINE_HOVER_FILTER,
          paint: {
            "fill-color": countryMarineHoverFill(
              selected,
              colorMode,
              countryVisitTypes,
            ),
            "fill-opacity": hoverStrength,
          },
        },
      },
      {
        beforeBaseFill: true,
        spec: {
          id: PALESTINE_LAYER,
          type: "fill",
          source: PALESTINE_SOURCE,
          paint: {
            "fill-color": countryFill(
              selected,
              partiallySelected,
              colorMode,
              mapTheme,
              hoverStrength,
              countryVisitTypes,
            ),
            "fill-outline-color": boundaryColor,
          },
        },
      },
      {
        beforeBaseFill: true,
        spec: {
          id: PALESTINE_VISIT_PATTERN_LAYER,
          type: "fill",
          source: PALESTINE_SOURCE,
          filter: visitPatternFilter(countryVisitTypes, "iso_a2"),
          paint: {
            "fill-pattern": visitPatternMatch(countryVisitTypes, "iso_a2"),
            "fill-opacity": 0.55,
            "fill-antialias": false,
          },
        },
      },
      {
        beforeBaseFill: true,
        spec: {
          id: SUBNATIONAL_LAYER,
          type: "fill",
          source: SUBNATIONAL_SOURCE,
          paint: {
            "fill-color": subnationalFill(
              selected,
              colorMode,
              mapTheme,
              hoverStrength,
              placeVisitTypes,
            ),
            "fill-outline-color": boundaryColor,
          },
        },
      },
      {
        beforeBaseFill: true,
        spec: {
          id: SUBNATIONAL_VISIT_PATTERN_LAYER,
          type: "fill",
          source: SUBNATIONAL_SOURCE,
          filter: admin1VisitPatternFilter(
            countryVisitTypes,
            subdivisionVisitTypes,
          ),
          paint: {
            "fill-pattern": admin1VisitPattern(
              countryVisitTypes,
              subdivisionVisitTypes,
            ),
            "fill-opacity": 0.55,
            "fill-antialias": false,
          },
        },
      },
    ],
  };
}

export function createMaritimeMapSpecs({
  maritimeSelected,
  eezDisplayMode,
  colorMode,
  hoverStrength,
  maritimeVisitTypes = {},
}) {
  const visible = eezDisplayMode !== "none" ? "visible" : "none";
  const prefix = marinePropertyPrefix(eezDisplayMode);
  const detailPairs = [
    {
      source: MARITIME_OVERVIEW_SOURCE,
      zoom: { maxzoom: MARITIME_DETAIL_ZOOM },
    },
    {
      source: MARITIME_SOURCE,
      zoom: { minzoom: MARITIME_DETAIL_ZOOM },
    },
  ];
  const hitIds = [MARITIME_HIT_LAYER, MARITIME_DETAIL_HIT_LAYER];
  const baseIds = [MARITIME_BASE_LAYER, MARITIME_DETAIL_BASE_LAYER];
  const activeIds = [MARITIME_ACTIVE_LAYER, MARITIME_DETAIL_ACTIVE_LAYER];
  const patternIds = [MARITIME_PATTERN_LAYER, MARITIME_DETAIL_PATTERN_LAYER];
  const hoverIds = [MARITIME_HOVER_LAYER, MARITIME_DETAIL_HOVER_LAYER];

  return {
    sources: [
      {
        id: MARITIME_SOURCE,
        spec: {
          type: "geojson",
          data: "/data/maritime-country-targets.geojson",
          attribution:
            '<a href="https://www.marineregions.org/" target="_blank">Marine Regions EEZ v12 + 24 NM Zones v4 + Territorial Seas v4 (CC BY 4.0)</a>',
        },
      },
      {
        id: MARITIME_OVERVIEW_SOURCE,
        spec: {
          type: "geojson",
          data: "/data/maritime-country-targets-overview.geojson",
        },
      },
      {
        id: BOUVET_HIT_SOURCE,
        spec: {
          type: "geojson",
          data: {
            type: "Feature",
            id: "bouvet-hit",
            properties: {
              code1: "bv",
              name1: "Bouvet Island",
              code2: "",
              name2: "",
              code3: "",
              name3: "",
              aidCode1: "bv",
              aidName1: "Bouvet Island",
              aidCode2: "",
              aidName2: "",
              aidCode3: "",
              aidName3: "",
              selectionAid: true,
            },
            geometry: {
              type: "Point",
              coordinates: [3.4, -54.43333333],
            },
          },
        },
      },
    ],
    layers: [
      ...detailPairs.map(({ source, zoom }, index) => ({
        spec: {
          id: hitIds[index],
          type: "fill",
          source,
          ...zoom,
          filter: marineHitFilter(eezDisplayMode),
          paint: {
            "fill-color": "rgba(0, 0, 0, 0.01)",
            "fill-opacity": 0.01,
          },
        },
      })),
      {
        spec: {
          id: BOUVET_MARITIME_HIT_LAYER,
          type: "circle",
          source: BOUVET_HIT_SOURCE,
          paint: {
            "circle-color": "rgba(0, 0, 0, 0.01)",
            "circle-opacity": 0.01,
            "circle-radius": 18,
          },
        },
      },
      ...detailPairs.map(({ source, zoom }, index) => ({
        spec: {
          id: baseIds[index],
          type: "fill",
          source,
          ...zoom,
          filter: marineDisplayFilter(eezDisplayMode),
          layout: { visibility: visible },
          paint: {
            "fill-color": highlightColor(colorMode, "active", `${prefix}1`),
            "fill-opacity": marineBaseOpacity(eezDisplayMode),
            "fill-antialias": false,
          },
        },
      })),
      ...detailPairs.map(({ source, zoom }, index) => ({
        spec: {
          id: activeIds[index],
          type: "fill",
          source,
          ...zoom,
          filter: marineSelectedFilter(maritimeSelected, eezDisplayMode),
          layout: { visibility: visible },
          paint: {
            "fill-color": marineVisitColor(
              maritimeVisitTypes,
              eezDisplayMode,
              colorMode,
              "active",
            ),
            "fill-opacity": 0.16,
            "fill-antialias": false,
          },
        },
      })),
      ...detailPairs.map(({ source, zoom }, index) => ({
        spec: {
          id: patternIds[index],
          type: "fill",
          source,
          ...zoom,
          filter: [
            "all",
            marineSelectedFilter(maritimeSelected, eezDisplayMode),
            marineVisitPatternFilter(maritimeVisitTypes, eezDisplayMode),
          ],
          layout: { visibility: visible },
          paint: {
            "fill-pattern": marineVisitPattern(
              maritimeVisitTypes,
              eezDisplayMode,
            ),
            "fill-opacity": 0.42,
            "fill-antialias": false,
          },
        },
      })),
      ...detailPairs.map(({ source, zoom }, index) => ({
        spec: {
          id: hoverIds[index],
          type: "fill",
          source,
          ...zoom,
          filter: NO_MARITIME_HOVER_FILTER,
          layout: { visibility: visible },
          paint: {
            "fill-color": marineColor(
              maritimeSelected,
              eezDisplayMode,
              colorMode,
              maritimeVisitTypes,
            ),
            "fill-opacity": 0.58 * hoverStrength,
            "fill-antialias": false,
          },
        },
      })),
    ],
  };
}

export function registerMapSpecs(map, specs, firstMapFillLayer) {
  specs.sources.forEach(({ id, spec }) => map.addSource(id, spec));
  specs.layers.forEach(({ spec, beforeBaseFill }) => {
    map.addLayer(spec, beforeBaseFill ? firstMapFillLayer : undefined);
  });
}
