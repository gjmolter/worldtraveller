import { useEffect, useImperativeHandle, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { getCountryById, microstateCallouts } from "../utils/mapData";
import {
  getSubdivisionById,
  getSubdivisionsForParent,
  subdivisions,
} from "../utils/subdivisionData";
import subdivisionCentroidData from "../data/subdivision-centroids.json";
import {
  closestMarineFeatureToPoint,
  closestPlaceToPoint,
  marineBaseOpacity,
  marineDisplayFilter,
  marineHitFilter,
  marinePropertyPrefix,
  marineSelectedFilter,
  resolveMarinePlaces,
} from "../utils/maritimeInteraction.mjs";
import {
  BOUVET_MARITIME_HIT_LAYER,
  COUNTRY_INTERACTION_LAYERS,
  COUNTRY_MARINE_HOVER_LAYER,
  COUNTRY_SOURCE,
  COUNTRY_SOURCE_LAYER,
  COUNTRY_VISIT_PATTERN_LAYER,
  createLandMapSpecs,
  createMaritimeMapSpecs,
  MARITIME_ACTIVE_LAYER,
  MARITIME_BASE_LAYER,
  MARITIME_DETAIL_ACTIVE_LAYER,
  MARITIME_DETAIL_BASE_LAYER,
  MARITIME_DETAIL_HIT_LAYER,
  MARITIME_DETAIL_HOVER_LAYER,
  MARITIME_HIT_LAYER,
  MARITIME_HOVER_LAYER,
  MARITIME_PATTERN_LAYER,
  MARITIME_DETAIL_PATTERN_LAYER,
  NO_COUNTRY_MARINE_HOVER_FILTER,
  NO_MARITIME_HOVER_FILTER,
  PALESTINE_LAYER,
  PALESTINE_SOURCE,
  PALESTINE_VISIT_PATTERN_LAYER,
  registerMapSpecs,
  SUBNATIONAL_LAYER,
  SUBNATIONAL_SOURCE,
  SUBNATIONAL_VISIT_PATTERN_LAYER,
} from "../utils/mapLayerSpecs.mjs";
import {
  countryHighlightColor,
  getMapPalette,
  getVisitTypeColor,
} from "../utils/mapColors";
import {
  admin1Fill,
  admin1Filter,
  admin1ParentHoverFill,
  admin1VisitPattern,
  admin1VisitPatternFilter,
  atlasPalette,
  countryFill,
  countryMarineHoverFill,
  hiddenMicrostateLabelNames,
  highlightColor,
  marineColor,
  marineVisitPattern,
  marineVisitPatternFilter,
  marineVisitColor,
  subnationalFill,
  visitPatternFilter,
  visitPatternImages,
  visitPatternMatch,
} from "../utils/mapPresentation.mjs";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const WORLD_BOUNDS = [
  [-179, -58],
  [179, 82],
];

const PAPER_ATLAS_STYLE = "https://tiles.openfreemap.org/styles/positron";
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const ADMIN1_SOURCE = "admin1-subdivisions";
const ADMIN1_LAYER = "admin1-subdivision-fill";
const ADMIN1_VISIT_PATTERN_LAYER = "admin1-visit-pattern";
const ADMIN1_PARENT_HOVER_LAYER = "admin1-parent-hover-fill";
const ADMIN1_ATTRIBUTION =
  '<a href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html" target="_blank">U.S. Census Bureau</a> · <a href="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" target="_blank">Statistics Canada</a> · <a href="https://www.ibge.gov.br/geociencias/organizacao_do_territorio/malhas_territoriais/15774-malhas.html" target="_blank">IBGE</a> · <a href="https://www.inegi.org.mx/programas/mg/" target="_blank">INEGI</a> · <a href="https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files" target="_blank">ABS</a> · <a href="https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG" target="_blank">Argentina IGN</a> · <a href="https://gdz.bkg.bund.de/index.php/default/open-data/wfs-verwaltungsgebiete-1-250-000-stand-01-01-wfs-vg250.html" target="_blank">BKG</a> · <a href="https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/" target="_blank">Istat</a> · <a href="https://www.gsi.go.jp/kankyochiri/gm_japan_e.html" target="_blank">Japan GSI</a> · <a href="https://www.geoboundaries.org/" target="_blank">geoBoundaries</a>';
const ADMIN1_PARENT_IDS = new Set(
  subdivisions.map(({ parentId }) => parentId.toLowerCase()),
);
const MARITIME_SUBDIVISION_CANDIDATES = subdivisions.reduce(
  (candidatesByParent, place) => {
    const coordinates = subdivisionCentroidData.centroids[place.id];
    if (!coordinates) return candidatesByParent;
    const candidates = candidatesByParent.get(place.parentId) || [];
    candidates.push({
      ...place,
      coordinates,
      marineCode: place.parentId,
    });
    candidatesByParent.set(place.parentId, candidates);
    return candidatesByParent;
  },
  new Map(),
);
const NO_ADMIN1_PARENT_HOVER_FILTER = [
  "==",
  ["get", "parent_id"],
  "__no_admin1_parent_hover__",
];

function marineSelectionCodes(selectedCountries, selectedSubdivisions) {
  return [
    ...new Set([
      ...selectedCountries,
      ...selectedSubdivisions,
      ...selectedCountries.flatMap((countryId) =>
        getSubdivisionsForParent(countryId).map(({ id }) => id),
      ),
    ]),
  ];
}

function setCalloutPalette(
  element,
  code,
  colorMode,
  visitType = "visited",
) {
  const palette = getMapPalette(colorMode);
  const color = (state) =>
    palette.countryColors
      ? countryHighlightColor(code, state)
      : palette[state];
  element.style.setProperty(
    "--marker-active",
    getVisitTypeColor(colorMode, visitType, "active", code),
  );
  element.style.setProperty("--marker-hover", color("hover"));
  element.style.setProperty(
    "--marker-active-hover",
    getVisitTypeColor(colorMode, visitType, "hover", code),
  );
  element.dataset.visitType = visitType;
}

function createVisitPatternImage(pattern) {
  const size = 12;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const isPatternPixel = pattern === "passed"
        ? (x + y) % 8 <= 1
        : (x % 6 <= 1 && y % 6 <= 1) ||
          ((x + 3) % 6 <= 1 && (y + 3) % 6 <= 1);
      if (!isPatternPixel) continue;
      const offset = (y * size + x) * 4;
      data[offset] = 20;
      data[offset + 1] = 20;
      data[offset + 2] = 20;
      data[offset + 3] = pattern === "passed" ? 92 : 104;
    }
  }
  return { width: size, height: size, data };
}

function registerVisitPatternImages(map) {
  for (const [visitType, imageName] of Object.entries(visitPatternImages)) {
    if (!map.hasImage(imageName)) {
      map.addImage(imageName, createVisitPatternImage(visitType));
    }
  }
}

function marineCountryFilter(code, eezDisplayMode) {
  if (!code) return NO_MARITIME_HOVER_FILTER;
  const prefix = marinePropertyPrefix(eezDisplayMode);

  return [
    "any",
    ["==", ["get", `${prefix}1`], code],
    ["==", ["get", `${prefix}2`], code],
    ["==", ["get", `${prefix}3`], code],
  ];
}

function placesForMarineFeature(
  feature,
  eezDisplayMode,
  detailedSubdivisionParentIds,
) {
  return resolveMarinePlaces({
    feature,
    eezDisplayMode,
    detailedSubdivisionParentIds,
    getCountryById,
    getSubdivisionById,
    subdivisionCandidatesByParent: MARITIME_SUBDIVISION_CANDIDATES,
  });
}

const baseLayerAppearance = new WeakMap();

function applyAtlasTheme(map, mapTheme, labelDensity) {
  const palette = atlasPalette(mapTheme);
  const layers = map.getStyle().layers || [];
  if (!baseLayerAppearance.has(map)) {
    baseLayerAppearance.set(
      map,
      new Map(layers.map((layer) => [layer.id, {
        textOpacity: layer.paint?.["text-opacity"] ?? 1,
        iconOpacity: layer.paint?.["icon-opacity"] ?? 1,
      }])),
    );
  }
  const original = baseLayerAppearance.get(map);

  layers.forEach((layer) => {
    const id = layer.id.toLowerCase();
    if (
      layer.id === "country-fill" ||
      [
        PALESTINE_LAYER,
        COUNTRY_MARINE_HOVER_LAYER,
        COUNTRY_VISIT_PATTERN_LAYER,
        SUBNATIONAL_LAYER,
        SUBNATIONAL_VISIT_PATTERN_LAYER,
        ADMIN1_LAYER,
        ADMIN1_VISIT_PATTERN_LAYER,
        ADMIN1_PARENT_HOVER_LAYER,
        MARITIME_HIT_LAYER,
        MARITIME_DETAIL_HIT_LAYER,
        BOUVET_MARITIME_HIT_LAYER,
        MARITIME_BASE_LAYER,
        MARITIME_DETAIL_BASE_LAYER,
        MARITIME_ACTIVE_LAYER,
        MARITIME_DETAIL_ACTIVE_LAYER,
        MARITIME_PATTERN_LAYER,
        MARITIME_DETAIL_PATTERN_LAYER,
        MARITIME_HOVER_LAYER,
        MARITIME_DETAIL_HOVER_LAYER,
        PALESTINE_VISIT_PATTERN_LAYER,
      ].includes(layer.id)
    ) return;

    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", palette.background);
      return;
    }

    if (layer.type === "fill") {
      if (/water/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", palette.water);
      } else {
        map.setPaintProperty(layer.id, "fill-opacity", 0);
      }
      return;
    }

    if (layer.type === "line") {
      if (/water|river|stream/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", palette.water);
      } else if (/boundary|border/.test(id)) {
        map.setPaintProperty(layer.id, "line-opacity", 0);
      } else if (/road|street|bridge|tunnel|rail/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", palette.roads);
      }
      return;
    }

    if (layer.type === "symbol") {
      if (layer.layout?.["text-field"]) {
        const labelName = [
          "coalesce",
          ["get", "name_en"],
          ["get", "name:en"],
          ["get", "name:latin"],
          ["get", "name"],
          "",
        ];
        const hiddenMicrostateLabel = [
          "in",
          labelName,
          ["literal", hiddenMicrostateLabelNames],
        ];
        const existingTextOpacity = original.get(layer.id)?.textOpacity ?? 1;
        const reducedAdministrativeLabel =
          /^label_(?:country(?:_|$)|state(?:_|$))/i.test(id);

        map.setPaintProperty(layer.id, "text-color", palette.text);
        map.setPaintProperty(layer.id, "text-halo-color", palette.textHalo);
        map.setPaintProperty(layer.id, "text-halo-width", 1);
        map.setPaintProperty(layer.id, "text-opacity", [
          "case",
          hiddenMicrostateLabel,
          0,
          labelDensity === "hidden" ||
            (labelDensity === "reduced" && !reducedAdministrativeLabel)
            ? 0
            : existingTextOpacity,
        ]);
      }

      if (layer.layout?.["icon-image"]) {
        const iconOpacity = labelDensity !== "full"
          ? 0
          : (original.get(layer.id)?.iconOpacity ?? 1) * 0.72;
        map.setPaintProperty(layer.id, "icon-opacity", iconOpacity);
      }
    }
  });
}

const WorldMap = ({
  controlRef,
  selected,
  partiallySelected = [],
  selectedSubdivisions = [],
  countryVisitTypes = {},
  subdivisionVisitTypes = {},
  maritimeVisitTypes = {},
  subdivisionMode = "visited",
  subdivisionsAtWorldZoom = false,
  subdivisionParentIds = [],
  eezDisplayMode = "aids",
  colorMode = "green",
  mapTheme = "paper",
  labelDensity = "full",
  hoverStrength = 1,
  onCountryClick,
  onSubdivisionClick,
  onCountryEnter,
  onCountryLeave,
  onZoom,
}) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const hoveredIdRef = useRef(null);
    const subnationalHoveredIdRef = useRef(null);
    const admin1HoveredIdRef = useRef(null);
    const marineHoveredKeyRef = useRef(null);
    const marineHoveredLandIdRef = useRef(null);
    const marineHoveredPlaceIdRef = useRef(null);
    const eezDisplayModeRef = useRef(eezDisplayMode);
    const subdivisionPresentationRef = useRef(null);
    const ensureAdmin1LayerRef = useRef(null);
    const calloutElementsRef = useRef(new Map());
    const callbacksRef = useRef({
      onCountryClick,
      onSubdivisionClick,
      onCountryEnter,
      onCountryLeave,
      onZoom,
    });

    callbacksRef.current = {
      onCountryClick,
      onSubdivisionClick,
      onCountryEnter,
      onCountryLeave,
      onZoom,
    };
    eezDisplayModeRef.current = eezDisplayMode;
    subdivisionPresentationRef.current = {
      selected,
      selectedSubdivisions,
      countryVisitTypes,
      subdivisionVisitTypes,
      subdivisionMode,
      subdivisionParentIds,
      subdivisionsAtWorldZoom,
      colorMode,
      mapTheme,
      hoverStrength,
    };
    const maritimeSelected = marineSelectionCodes(
      selected,
      selectedSubdivisions,
    );

    useEffect(() => {
      if (!containerRef.current) return undefined;

      let calloutMarkers = [];
      let updateCalloutVisibility;
      let marineHoverFrame = null;
      let lastMarineHoverTime = 0;
      let pendingMarinePointer = null;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: PAPER_ATLAS_STYLE,
        center: [0, 12],
        zoom: 1.15,
        minZoom: -0.75,
        maxZoom: 8,
        attributionControl: false,
        preserveDrawingBuffer: true,
        renderWorldCopies: true,
      });

      const handleMissingVisitPattern = ({ id }) => {
        const visitType = Object.entries(visitPatternImages).find(
          ([, imageName]) => imageName === id,
        )?.[0];
        if (visitType && !map.hasImage(id)) {
          map.addImage(id, createVisitPatternImage(visitType));
        }
      };
      map.on("styleimagemissing", handleMissingVisitPattern);

      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") {
        window.__CPBR_ATLAS_MAP__ = map;
      }

      const setMapCursor = (cursor = "") => {
        const canvas = map.getCanvas();
        const canvasContainer = map.getCanvasContainer();
        const isPointer = cursor === "pointer";

        canvas.style.cursor = cursor;
        canvasContainer.style.cursor = cursor;
        canvasContainer.classList.toggle(
          "maplibregl-track-pointer",
          isPointer,
        );
      };

      map.on("load", () => {
        applyAtlasTheme(map, mapTheme, labelDensity);
        const themePalette = atlasPalette(mapTheme);
        const boundaryColor = themePalette.boundaries.soft;

        if (!MAPTILER_KEY) {
          console.error(
            "NEXT_PUBLIC_MAPTILER_KEY is required for country highlighting",
          );
          return;
        }

        const firstMapFillLayer = map
          .getStyle()
          .layers?.find((layer) => layer.type === "fill")?.id;
        registerVisitPatternImages(map);
        registerMapSpecs(
          map,
          createLandMapSpecs({
            maptilerKey: MAPTILER_KEY,
            selected,
            partiallySelected,
            colorMode,
            mapTheme,
            hoverStrength,
            countryVisitTypes,
            subdivisionVisitTypes,
          }),
          firstMapFillLayer,
        );
        registerMapSpecs(
          map,
          createMaritimeMapSpecs({
            maritimeSelected,
            eezDisplayMode,
            colorMode,
            hoverStrength,
            maritimeVisitTypes,
          }),
        );

        const setLandFeatureHover = (featureId, hover) => {
          if (!featureId) return;
          map.setFeatureState(
            {
              source: COUNTRY_SOURCE,
              sourceLayer: COUNTRY_SOURCE_LAYER,
              id: featureId,
            },
            { hover },
          );
          map.setFeatureState(
            {
              source: PALESTINE_SOURCE,
              id: featureId,
            },
            { hover },
          );
          map.setFeatureState(
            {
              source: SUBNATIONAL_SOURCE,
              id: String(featureId).toLowerCase(),
            },
            { hover },
          );
          if (!map.getLayer(ADMIN1_PARENT_HOVER_LAYER)) return;
          map.setFilter(
            ADMIN1_PARENT_HOVER_LAYER,
            hover
              ? ["==", ["get", "parent_id"], String(featureId).toLowerCase()]
              : NO_ADMIN1_PARENT_HOVER_FILTER,
          );
        };

        const setLandFeatureHoverByCode = (countryCode, hover) => {
          if (!countryCode) return;
          const normalizedCode = String(countryCode).toUpperCase();
          map.setFilter(
            COUNTRY_MARINE_HOVER_LAYER,
            hover
              ? ["==", ["get", "iso_a2"], normalizedCode]
              : NO_COUNTRY_MARINE_HOVER_FILTER,
          );
          map.setFeatureState(
            { source: PALESTINE_SOURCE, id: normalizedCode },
            { hover },
          );
          map.setFeatureState(
            {
              source: SUBNATIONAL_SOURCE,
              id: normalizedCode.toLowerCase(),
            },
            { hover },
          );
          if (map.getLayer(ADMIN1_PARENT_HOVER_LAYER)) {
            map.setFilter(
              ADMIN1_PARENT_HOVER_LAYER,
              hover
                ? [
                    "==",
                    ["get", "parent_id"],
                    normalizedCode.toLowerCase(),
                  ]
                : NO_ADMIN1_PARENT_HOVER_FILTER,
            );
          }
        };

        const clearCountryFeatureHover = () => {
          if (
            hoveredIdRef.current &&
            hoveredIdRef.current !== marineHoveredLandIdRef.current
          ) {
            setLandFeatureHover(hoveredIdRef.current, false);
          }
          hoveredIdRef.current = null;
        };

        const clearSubnationalFeatureHover = () => {
          if (subnationalHoveredIdRef.current != null) {
            map.setFeatureState(
              {
                source: SUBNATIONAL_SOURCE,
                id: subnationalHoveredIdRef.current,
              },
              { hover: false },
            );
          }
          subnationalHoveredIdRef.current = null;
        };

        const clearAdmin1FeatureHover = () => {
          if (
            admin1HoveredIdRef.current != null &&
            map.getSource(ADMIN1_SOURCE)
          ) {
            map.setFeatureState(
              { source: ADMIN1_SOURCE, id: admin1HoveredIdRef.current },
              { hover: false },
            );
          }
          admin1HoveredIdRef.current = null;
        };

        const setMarineHoveredLand = (featureId) => {
          const previousId = marineHoveredLandIdRef.current;
          if (previousId === featureId) return;

          if (previousId && previousId !== hoveredIdRef.current) {
            setLandFeatureHoverByCode(previousId, false);
          }

          marineHoveredLandIdRef.current = featureId;
          if (featureId) setLandFeatureHoverByCode(featureId, true);
        };

        const clearMaritimeOverlayHover = () => {
          if (marineHoveredKeyRef.current == null) return false;
          [MARITIME_HOVER_LAYER, MARITIME_DETAIL_HOVER_LAYER].forEach(
            (layerId) => {
              if (map.getLayer(layerId)) {
                map.setFilter(layerId, NO_MARITIME_HOVER_FILTER);
              }
            },
          );
          marineHoveredKeyRef.current = null;
          return true;
        };

        const setMaritimeOverlayHover = (code) => {
          if (!code || eezDisplayModeRef.current === "none") {
            clearMaritimeOverlayHover();
            return false;
          }
          if (code === marineHoveredKeyRef.current) return false;

          marineHoveredKeyRef.current = code;
          const hoverFilter = marineCountryFilter(
            code,
            eezDisplayModeRef.current,
          );
          [MARITIME_HOVER_LAYER, MARITIME_DETAIL_HOVER_LAYER].forEach(
            (layerId) => {
              if (map.getLayer(layerId)) map.setFilter(layerId, hoverFilter);
            },
          );
          return true;
        };
        calloutMarkers = microstateCallouts.map((country) => {
          const element = document.createElement("button");
          element.type = "button";
          element.className = "microstateMarker";
          element.dataset.minZoom = String(country.minZoom);
          element.setAttribute("aria-label", `Select ${country.name}`);

          const label = document.createElement("span");
          label.className = "microstateLabel";
          label.textContent = country.name;

          const pin = document.createElement("span");
          pin.className = "microstatePin";
          pin.setAttribute("aria-hidden", "true");

          element.append(label, pin);
          element.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            callbacksRef.current.onCountryClick?.(country.id);
          });
          const showCountry = (event) => {
            event.stopPropagation();
            setMaritimeOverlayHover(country.id);
            callbacksRef.current.onCountryEnter?.(country.name);
          };
          element.addEventListener("mouseenter", showCountry);
          element.addEventListener("mousemove", showCountry);
          element.addEventListener("mouseleave", (event) => {
            event.stopPropagation();
            clearMaritimeOverlayHover();
            callbacksRef.current.onCountryLeave?.();
          });
          element.classList.toggle("selected", selected.includes(country.id));
          setCalloutPalette(
            element,
            country.id,
            colorMode,
            countryVisitTypes[country.id],
          );
          calloutElementsRef.current.set(country.id, element);

          return new maplibregl.Marker({ element, anchor: "center" })
            .setLngLat(country.coordinates)
            .addTo(map);
        });

        updateCalloutVisibility = () => {
          calloutElementsRef.current.forEach((element) => {
            element.hidden =
              map.getZoom() < Number(element.dataset.minZoom || 4.25);
          });
        };
        updateCalloutVisibility();
        map.on("zoom", updateCalloutVisibility);

        map.fitBounds(WORLD_BOUNDS, { padding: 20, duration: 0 });

        const handleCountryMouseMove = (event) => {
          const subdivisionLayers = [SUBNATIONAL_LAYER, ADMIN1_LAYER].filter(
            (layerId) => map.getLayer(layerId),
          );
          if (
            subdivisionLayers.length &&
            map.queryRenderedFeatures(event.point, {
              layers: subdivisionLayers,
            }).length
          ) {
            clearCountryFeatureHover();
            return;
          }
          clearSubnationalFeatureHover();
          clearAdmin1FeatureHover();
          const feature = event.features?.[0];
          if (!feature) return;

          const code = feature.properties.iso_a2.toLowerCase();
          if (
            subdivisionPresentationRef.current?.subdivisionParentIds.includes(
              code,
            )
          ) {
            clearCountryFeatureHover();
            setMapCursor();
            clearMaritimeOverlayHover();
            callbacksRef.current.onCountryLeave?.();
            return;
          }

          const featureId = feature.id;
          if (featureId == null) return;
          if (featureId !== hoveredIdRef.current) {
            if (
              hoveredIdRef.current &&
              hoveredIdRef.current !== marineHoveredLandIdRef.current
            ) {
              setLandFeatureHover(hoveredIdRef.current, false);
            }

            hoveredIdRef.current = featureId;
            setLandFeatureHover(featureId, true);
          }

          setMapCursor("pointer");

          setMaritimeOverlayHover(code);
          callbacksRef.current.onCountryEnter?.(
            getCountryById(code)?.name || feature.properties.name,
          );
        };
        COUNTRY_INTERACTION_LAYERS.forEach((layerId) => {
          map.on("mousemove", layerId, handleCountryMouseMove);
        });

        const handleCountryMouseLeave = () => {
          setMapCursor();
          clearCountryFeatureHover();
          clearMaritimeOverlayHover();
          callbacksRef.current.onCountryLeave?.();
        };
        COUNTRY_INTERACTION_LAYERS.forEach((layerId) => {
          map.on("mouseleave", layerId, handleCountryMouseLeave);
        });

        const handleSubnationalMouseMove = (event) => {
          const feature = event.features?.[0];
          if (!feature?.properties?.app_id || feature.id == null) return;

          clearCountryFeatureHover();
          clearAdmin1FeatureHover();

          if (feature.id !== subnationalHoveredIdRef.current) {
            if (subnationalHoveredIdRef.current != null) {
              map.setFeatureState(
                {
                  source: SUBNATIONAL_SOURCE,
                  id: subnationalHoveredIdRef.current,
                },
                { hover: false },
              );
            }
            subnationalHoveredIdRef.current = feature.id;
            map.setFeatureState(
              { source: SUBNATIONAL_SOURCE, id: feature.id },
              { hover: true },
            );
          }

          setMapCursor("pointer");
          setMaritimeOverlayHover(feature.properties.app_id);
          callbacksRef.current.onCountryEnter?.(
            getCountryById(feature.properties.app_id)?.name ||
              feature.properties.name,
          );
        };
        map.on("mousemove", SUBNATIONAL_LAYER, handleSubnationalMouseMove);
        map.on("mouseleave", SUBNATIONAL_LAYER, () => {
          clearSubnationalFeatureHover();
          setMapCursor();
          clearMaritimeOverlayHover();
          callbacksRef.current.onCountryLeave?.();
        });
        map.on("click", SUBNATIONAL_LAYER, (event) => {
          const code = event.features?.[0]?.properties?.app_id;
          if (getCountryById(code)) callbacksRef.current.onCountryClick?.(code);
        });

        const handleAdmin1MouseMove = (event) => {
          const feature = event.features?.[0];
          const id = feature?.properties?.app_id;
          if (!id || feature.id == null) return;

          clearCountryFeatureHover();
          clearSubnationalFeatureHover();

          if (feature.id !== admin1HoveredIdRef.current) {
            if (admin1HoveredIdRef.current != null) {
              map.setFeatureState(
                { source: ADMIN1_SOURCE, id: admin1HoveredIdRef.current },
                { hover: false },
              );
            }
            admin1HoveredIdRef.current = feature.id;
            map.setFeatureState(
              { source: ADMIN1_SOURCE, id: feature.id },
              { hover: true },
            );
          }

          setMapCursor("pointer");
          setMaritimeOverlayHover(feature.properties.parent_id);
          callbacksRef.current.onCountryEnter?.(feature.properties.name);
        };
        const handleAdmin1MouseLeave = () => {
          clearAdmin1FeatureHover();
          setMapCursor();
          clearMaritimeOverlayHover();
          callbacksRef.current.onCountryLeave?.();
        };
        const handleAdmin1Click = (event) => {
          const id = event.features?.[0]?.properties?.app_id;
          if (id) callbacksRef.current.onSubdivisionClick?.(id);
        };
        let admin1InteractionsRegistered = false;
        const ensureAdmin1Layer = () => {
          if (map.getLayer(ADMIN1_LAYER)) return;

          const presentation = subdivisionPresentationRef.current;
          if (!presentation || presentation.subdivisionMode === "off") return;

          if (!map.getSource(ADMIN1_SOURCE)) {
            map.addSource(ADMIN1_SOURCE, {
              type: "geojson",
              data: "/data/admin1-subdivisions.geojson",
              promoteId: "app_id",
              attribution: ADMIN1_ATTRIBUTION,
            });
          }
          map.addLayer(
            {
              id: ADMIN1_LAYER,
              type: "fill",
              source: ADMIN1_SOURCE,
              minzoom: presentation.subdivisionsAtWorldZoom ? 0 : 2.25,
              filter: admin1Filter(
                presentation.selected,
                presentation.subdivisionMode,
                presentation.subdivisionParentIds,
                ADMIN1_PARENT_IDS,
              ),
              paint: {
                "fill-color": admin1Fill(
                  presentation.selected,
                  presentation.selectedSubdivisions,
                  presentation.colorMode,
                  presentation.mapTheme,
                  presentation.hoverStrength,
                  presentation.countryVisitTypes,
                  presentation.subdivisionVisitTypes,
                ),
                "fill-outline-color": atlasPalette(
                  presentation.mapTheme,
                ).boundaries.soft,
              },
            },
            firstMapFillLayer,
          );
          map.addLayer(
            {
              id: ADMIN1_VISIT_PATTERN_LAYER,
              type: "fill",
              source: ADMIN1_SOURCE,
              minzoom: presentation.subdivisionsAtWorldZoom ? 0 : 2.25,
              filter: [
                "all",
                admin1Filter(
                  presentation.selected,
                  presentation.subdivisionMode,
                  presentation.subdivisionParentIds,
                  ADMIN1_PARENT_IDS,
                ),
                admin1VisitPatternFilter(
                  presentation.countryVisitTypes,
                  presentation.subdivisionVisitTypes,
                ),
              ],
              paint: {
                "fill-pattern": admin1VisitPattern(
                  presentation.countryVisitTypes,
                  presentation.subdivisionVisitTypes,
                ),
                "fill-opacity": 0.55,
                "fill-antialias": false,
              },
            },
            firstMapFillLayer,
          );
          map.addLayer(
            {
              id: ADMIN1_PARENT_HOVER_LAYER,
              type: "fill",
              source: ADMIN1_SOURCE,
              minzoom: presentation.subdivisionsAtWorldZoom ? 0 : 2.25,
              filter: NO_ADMIN1_PARENT_HOVER_FILTER,
              paint: {
                "fill-color": admin1ParentHoverFill(
                  presentation.selected,
                  presentation.selectedSubdivisions,
                  presentation.colorMode,
                  presentation.countryVisitTypes,
                  presentation.subdivisionVisitTypes,
                ),
                "fill-outline-color": atlasPalette(
                  presentation.mapTheme,
                ).boundaries.soft,
                "fill-opacity": presentation.hoverStrength,
              },
            },
            firstMapFillLayer,
          );

          if (!admin1InteractionsRegistered) {
            map.on("mousemove", ADMIN1_LAYER, handleAdmin1MouseMove);
            map.on("mouseleave", ADMIN1_LAYER, handleAdmin1MouseLeave);
            map.on("click", ADMIN1_LAYER, handleAdmin1Click);
            admin1InteractionsRegistered = true;
          }
        };
        ensureAdmin1LayerRef.current = ensureAdmin1Layer;
        ensureAdmin1Layer();

        const handleCountryClick = (event) => {
          const code = event.features?.[0]?.properties?.iso_a2?.toLowerCase();
          if (
            subdivisionPresentationRef.current?.subdivisionParentIds.includes(
              code,
            )
          ) {
            return;
          }
          const subdivisionLayers = [SUBNATIONAL_LAYER, ADMIN1_LAYER].filter(
            (layerId) => map.getLayer(layerId),
          );
          if (
            subdivisionLayers.length &&
            map.queryRenderedFeatures(event.point, {
              layers: subdivisionLayers,
            }).length
          ) {
            return;
          }
          if (getCountryById(code)) callbacksRef.current.onCountryClick?.(code);
        };
        COUNTRY_INTERACTION_LAYERS.forEach((layerId) => {
          map.on("click", layerId, handleCountryClick);
        });

        const clearMarineHover = () => {
          clearMaritimeOverlayHover();
          setMarineHoveredLand(null);
          marineHoveredPlaceIdRef.current = null;
        };

        const cancelQueuedMarineHover = () => {
          pendingMarinePointer = null;
          if (marineHoverFrame != null) {
            window.cancelAnimationFrame(marineHoverFrame);
            marineHoverFrame = null;
          }
        };

        const clearMarineInteraction = () => {
          const hadMarineHover =
            marineHoveredKeyRef.current != null ||
            marineHoveredLandIdRef.current != null ||
            marineHoveredPlaceIdRef.current != null;
          cancelQueuedMarineHover();
          setMapCursor();
          clearMarineHover();
          if (hadMarineHover) callbacksRef.current.onCountryLeave?.();
        };

        map.on("movestart", clearMarineInteraction);
        map.on("moveend", clearMarineInteraction);
        map.on("mouseout", clearMarineInteraction);

        const showMarineFeatureHover = (features, lngLat) => {
          const feature = closestMarineFeatureToPoint(features, lngLat);
          const choices = placesForMarineFeature(
            feature,
            eezDisplayModeRef.current,
            subdivisionPresentationRef.current?.subdivisionParentIds || [],
          );
          const closestPlace = closestPlaceToPoint(choices, lngLat);
          const hoverCode = closestPlace?.marineCode;
          if (!hoverCode) {
            clearMarineInteraction();
            return false;
          }

          const hoverChanged = setMaritimeOverlayHover(hoverCode);
          const placeChanged =
            marineHoveredPlaceIdRef.current !== closestPlace.id;
          marineHoveredPlaceIdRef.current = closestPlace.id;
          const hoverSubdivision = getSubdivisionById(closestPlace.id);
          setMarineHoveredLand(
            (hoverSubdivision?.parentId || closestPlace.id).toUpperCase(),
          );
          setMapCursor("pointer");

          if (hoverChanged || placeChanged) {
            callbacksRef.current.onCountryEnter?.(closestPlace.name);
          }
          return true;
        };

        const handleMarineMouseMove = (event) => {
          if (map.isMoving()) {
            clearMarineInteraction();
            return;
          }

          const landLayers = [
            ADMIN1_LAYER,
            SUBNATIONAL_LAYER,
            ...COUNTRY_INTERACTION_LAYERS,
          ].filter((layerId) => map.getLayer(layerId));
          if (
            landLayers.length &&
            map.queryRenderedFeatures(event.point, { layers: landLayers }).length
          ) {
            setMarineHoveredLand(null);
            marineHoveredPlaceIdRef.current = null;
            return;
          }

          const features = map.queryRenderedFeatures(event.point, {
            layers: [
              BOUVET_MARITIME_HIT_LAYER,
              MARITIME_DETAIL_HIT_LAYER,
              MARITIME_HIT_LAYER,
            ],
          });
          if (features.length) {
            showMarineFeatureHover(features, event.lngLat);
            return;
          }
          clearMarineInteraction();
        };
        const queueMarineMouseMove = (event) => {
          pendingMarinePointer = {
            point: [event.point.x, event.point.y],
            lngLat: { lng: event.lngLat.lng, lat: event.lngLat.lat },
          };
          if (marineHoverFrame != null) return;

          const flushMarineHover = (timestamp) => {
            if (timestamp - lastMarineHoverTime < 32) {
              marineHoverFrame = window.requestAnimationFrame(flushMarineHover);
              return;
            }

            marineHoverFrame = null;
            lastMarineHoverTime = timestamp;
            const nextPointer = pendingMarinePointer;
            pendingMarinePointer = null;
            if (nextPointer) handleMarineMouseMove(nextPointer);
          };
          marineHoverFrame = window.requestAnimationFrame(flushMarineHover);
        };
        map.on("mousemove", queueMarineMouseMove);

        [
          MARITIME_HIT_LAYER,
          MARITIME_DETAIL_HIT_LAYER,
          BOUVET_MARITIME_HIT_LAYER,
        ].forEach((layerId) => {
          map.on("mouseenter", layerId, handleMarineMouseMove);
        });

        const handleMarineClick = (event) => {
          const landFeature = map.queryRenderedFeatures(event.point, {
            layers: COUNTRY_INTERACTION_LAYERS,
          })[0];
          const landCode = landFeature?.properties?.iso_a2?.toLowerCase();
          if (getCountryById(landCode)) return;

          const features = map.queryRenderedFeatures(event.point, {
            layers: [
              BOUVET_MARITIME_HIT_LAYER,
              MARITIME_DETAIL_HIT_LAYER,
              MARITIME_HIT_LAYER,
            ],
          });
          const feature = closestMarineFeatureToPoint(features, event.lngLat);
          const choices = placesForMarineFeature(
            feature,
            eezDisplayModeRef.current,
            subdivisionPresentationRef.current?.subdivisionParentIds || [],
          );
          const closestPlace = closestPlaceToPoint(choices, event.lngLat);
          if (getSubdivisionById(closestPlace?.id)) {
            callbacksRef.current.onSubdivisionClick?.(closestPlace.id);
          } else if (closestPlace) {
            callbacksRef.current.onCountryClick?.(closestPlace.id);
          }
        };
        map.on("click", MARITIME_HIT_LAYER, handleMarineClick);
        map.on("click", MARITIME_DETAIL_HIT_LAYER, handleMarineClick);
        map.on("click", BOUVET_MARITIME_HIT_LAYER, handleMarineClick);
      });

      map.on("error", (event) => {
        console.error("World map error", event.error);
      });

      map.on("zoom", () => callbacksRef.current.onZoom?.(map.getZoom()));

      return () => {
        if (marineHoverFrame != null) {
          window.cancelAnimationFrame(marineHoverFrame);
        }
        if (updateCalloutVisibility) {
          map.off("zoom", updateCalloutVisibility);
        }
        calloutMarkers.forEach((marker) => marker.remove());
        calloutElementsRef.current.clear();
        map.off("styleimagemissing", handleMissingVisitPattern);
        map.remove();
        mapRef.current = null;
        if (window.__CPBR_ATLAS_MAP__ === map) {
          delete window.__CPBR_ATLAS_MAP__;
        }
        ensureAdmin1LayerRef.current = null;
      };
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.getLayer("country-fill")) return;
      applyAtlasTheme(map, mapTheme, labelDensity);
    }, [mapTheme, labelDensity]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.getLayer("country-fill")) return;
      const currentMaritimeSelected = marineSelectionCodes(
        selected,
        selectedSubdivisions,
      );
      if (subdivisionMode !== "off") {
        ensureAdmin1LayerRef.current?.();
      }
      const boundaryColor = atlasPalette(mapTheme).boundaries.soft;
      map.setPaintProperty(
        "country-fill",
        "fill-color",
        countryFill(
          selected,
          partiallySelected,
          colorMode,
          mapTheme,
          hoverStrength,
          countryVisitTypes,
        ),
      );
      map.setPaintProperty("country-fill", "fill-outline-color", boundaryColor);
      if (map.getLayer(COUNTRY_VISIT_PATTERN_LAYER)) {
        map.setFilter(COUNTRY_VISIT_PATTERN_LAYER, [
          "all",
          ["==", ["get", "level"], 0],
          ["has", "iso_a2"],
          ["!=", ["get", "iso_a2"], "GB"],
          visitPatternFilter(countryVisitTypes, "iso_a2"),
        ]);
        map.setPaintProperty(
          COUNTRY_VISIT_PATTERN_LAYER,
          "fill-pattern",
          visitPatternMatch(countryVisitTypes, "iso_a2"),
        );
      }
      if (map.getLayer(COUNTRY_MARINE_HOVER_LAYER)) {
        map.setPaintProperty(
          COUNTRY_MARINE_HOVER_LAYER,
          "fill-color",
          countryMarineHoverFill(selected, colorMode, countryVisitTypes),
        );
        map.setPaintProperty(
          COUNTRY_MARINE_HOVER_LAYER,
          "fill-opacity",
          hoverStrength,
        );
      }
      if (map.getLayer(PALESTINE_LAYER)) {
        map.setPaintProperty(
          PALESTINE_LAYER,
          "fill-color",
          countryFill(
            selected,
            partiallySelected,
            colorMode,
            mapTheme,
            hoverStrength,
            countryVisitTypes,
          ),
        );
        map.setPaintProperty(PALESTINE_LAYER, "fill-outline-color", boundaryColor);
      }
      if (map.getLayer(PALESTINE_VISIT_PATTERN_LAYER)) {
        map.setFilter(
          PALESTINE_VISIT_PATTERN_LAYER,
          visitPatternFilter(countryVisitTypes, "iso_a2"),
        );
        map.setPaintProperty(
          PALESTINE_VISIT_PATTERN_LAYER,
          "fill-pattern",
          visitPatternMatch(countryVisitTypes, "iso_a2"),
        );
      }
      if (map.getLayer(SUBNATIONAL_LAYER)) {
        map.setPaintProperty(
          SUBNATIONAL_LAYER,
          "fill-color",
          subnationalFill(
            selected,
            colorMode,
            mapTheme,
            hoverStrength,
            { ...countryVisitTypes, ...subdivisionVisitTypes },
          ),
        );
        map.setPaintProperty(SUBNATIONAL_LAYER, "fill-outline-color", boundaryColor);
      }
      if (map.getLayer(SUBNATIONAL_VISIT_PATTERN_LAYER)) {
        map.setFilter(
          SUBNATIONAL_VISIT_PATTERN_LAYER,
          admin1VisitPatternFilter(
            countryVisitTypes,
            subdivisionVisitTypes,
          ),
        );
        map.setPaintProperty(
          SUBNATIONAL_VISIT_PATTERN_LAYER,
          "fill-pattern",
          admin1VisitPattern(countryVisitTypes, subdivisionVisitTypes),
        );
      }
      if (map.getLayer(ADMIN1_LAYER)) {
        map.setFilter(
          ADMIN1_LAYER,
          admin1Filter(
            selected,
            subdivisionMode,
            subdivisionParentIds,
            ADMIN1_PARENT_IDS,
          ),
        );
        map.setLayerZoomRange(
          ADMIN1_LAYER,
          subdivisionsAtWorldZoom ? 0 : 2.25,
          24,
        );
        map.setPaintProperty(
          ADMIN1_LAYER,
          "fill-color",
          admin1Fill(
            selected,
            selectedSubdivisions,
            colorMode,
            mapTheme,
            hoverStrength,
            countryVisitTypes,
            subdivisionVisitTypes,
          ),
        );
        map.setPaintProperty(ADMIN1_LAYER, "fill-outline-color", boundaryColor);
      }
      if (map.getLayer(ADMIN1_VISIT_PATTERN_LAYER)) {
        map.setFilter(ADMIN1_VISIT_PATTERN_LAYER, [
          "all",
          admin1Filter(
            selected,
            subdivisionMode,
            subdivisionParentIds,
            ADMIN1_PARENT_IDS,
          ),
          admin1VisitPatternFilter(
            countryVisitTypes,
            subdivisionVisitTypes,
          ),
        ]);
        map.setLayerZoomRange(
          ADMIN1_VISIT_PATTERN_LAYER,
          subdivisionsAtWorldZoom ? 0 : 2.25,
          24,
        );
        map.setPaintProperty(
          ADMIN1_VISIT_PATTERN_LAYER,
          "fill-pattern",
          admin1VisitPattern(countryVisitTypes, subdivisionVisitTypes),
        );
      }
      if (map.getLayer(ADMIN1_PARENT_HOVER_LAYER)) {
        map.setLayerZoomRange(
          ADMIN1_PARENT_HOVER_LAYER,
          subdivisionsAtWorldZoom ? 0 : 2.25,
          24,
        );
        map.setPaintProperty(
          ADMIN1_PARENT_HOVER_LAYER,
          "fill-color",
          admin1ParentHoverFill(
            selected,
            selectedSubdivisions,
            colorMode,
            countryVisitTypes,
            subdivisionVisitTypes,
          ),
        );
        map.setPaintProperty(
          ADMIN1_PARENT_HOVER_LAYER,
          "fill-outline-color",
          boundaryColor,
        );
        map.setPaintProperty(
          ADMIN1_PARENT_HOVER_LAYER,
          "fill-opacity",
          hoverStrength,
        );
      }
      [MARITIME_ACTIVE_LAYER, MARITIME_DETAIL_ACTIVE_LAYER].forEach(
        (layerId) => {
          if (!map.getLayer(layerId)) return;
          map.setFilter(
            layerId,
            marineSelectedFilter(currentMaritimeSelected, eezDisplayMode),
          );
          map.setPaintProperty(
            layerId,
            "fill-color",
            marineVisitColor(
              maritimeVisitTypes,
              eezDisplayMode,
              colorMode,
              "active",
            ),
          );
        },
      );
      [MARITIME_PATTERN_LAYER, MARITIME_DETAIL_PATTERN_LAYER].forEach(
        (layerId) => {
          if (!map.getLayer(layerId)) return;
          map.setFilter(layerId, [
            "all",
            marineSelectedFilter(currentMaritimeSelected, eezDisplayMode),
            marineVisitPatternFilter(maritimeVisitTypes, eezDisplayMode),
          ]);
          map.setPaintProperty(
            layerId,
            "fill-pattern",
            marineVisitPattern(maritimeVisitTypes, eezDisplayMode),
          );
        },
      );
      [MARITIME_HIT_LAYER, MARITIME_DETAIL_HIT_LAYER].forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setFilter(layerId, marineHitFilter(eezDisplayMode));
        }
      });
      const displayFilter = marineDisplayFilter(eezDisplayMode);
      const visibility = eezDisplayMode === "none" ? "none" : "visible";
      [
        MARITIME_BASE_LAYER,
        MARITIME_DETAIL_BASE_LAYER,
        MARITIME_ACTIVE_LAYER,
        MARITIME_DETAIL_ACTIVE_LAYER,
        MARITIME_PATTERN_LAYER,
        MARITIME_DETAIL_PATTERN_LAYER,
        MARITIME_HOVER_LAYER,
        MARITIME_DETAIL_HOVER_LAYER,
      ].forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", visibility);
        }
      });
      [MARITIME_BASE_LAYER, MARITIME_DETAIL_BASE_LAYER].forEach((layerId) => {
        if (!map.getLayer(layerId)) return;
        map.setFilter(layerId, displayFilter);
        map.setPaintProperty(
          layerId,
          "fill-opacity",
          marineBaseOpacity(eezDisplayMode),
        );
        map.setPaintProperty(
          layerId,
          "fill-color",
          highlightColor(
            colorMode,
            "active",
            marinePropertyPrefix(eezDisplayMode) + "1",
          ),
        );
      });
      [MARITIME_HOVER_LAYER, MARITIME_DETAIL_HOVER_LAYER].forEach(
        (layerId) => {
          if (!map.getLayer(layerId)) return;
          map.setFilter(layerId, NO_MARITIME_HOVER_FILTER);
          map.setPaintProperty(
            layerId,
            "fill-color",
            marineColor(
              currentMaritimeSelected,
              eezDisplayMode,
              colorMode,
              maritimeVisitTypes,
            ),
          );
          map.setPaintProperty(
            layerId,
            "fill-opacity",
            0.58 * hoverStrength,
          );
        },
      );
      marineHoveredKeyRef.current = null;
      marineHoveredPlaceIdRef.current = null;
      calloutElementsRef.current.forEach((element, code) => {
        element.classList.toggle("selected", selected.includes(code));
        setCalloutPalette(
          element,
          code,
          colorMode,
          countryVisitTypes[code],
        );
      });
    }, [
      selected,
      partiallySelected,
      selectedSubdivisions,
      countryVisitTypes,
      subdivisionVisitTypes,
      maritimeVisitTypes,
      subdivisionMode,
      subdivisionParentIds,
      subdivisionsAtWorldZoom,
      eezDisplayMode,
      colorMode,
      mapTheme,
      hoverStrength,
    ]);

    useImperativeHandle(controlRef, () => ({
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      async captureWorld() {
        const map = mapRef.current;
        if (!map) return null;

        const previousCenter = map.getCenter();
        const previousZoom = map.getZoom();
        map.fitBounds(WORLD_BOUNDS, { padding: 24, duration: 0 });
        await new Promise((resolve) => map.once("idle", resolve));
        const image = map.getCanvas().toDataURL("image/png");
        map.jumpTo({ center: previousCenter, zoom: previousZoom });
        return image;
      },
    }));

    return (
      <>
        <div
          ref={containerRef}
          className="worldMap"
          aria-label="Interactive world map"
          style={{
            "--atlas-text": atlasPalette(mapTheme).text,
            "--atlas-text-halo": atlasPalette(mapTheme).textHalo,
          }}
        />
        <div
          className={`mapTextureOverlay ${mapTheme === "paper" ? "isVisible" : ""}`}
          aria-hidden="true"
        />

        <style jsx global>{`
          .mapTextureOverlay {
            position: absolute;
            z-index: 1;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='4' seed='17' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.42'/%3E%3C/svg%3E");
            mix-blend-mode: multiply;
            opacity: 0;
            pointer-events: none;
            transition: opacity 160ms ease;
          }

          .mapTextureOverlay.isVisible {
            opacity: 0.075;
          }

          .microstateMarker {
            display: grid;
            width: 26px;
            height: 26px;
            place-items: center;
            padding: 0;
            border: 0;
            background: transparent;
            color: var(--atlas-text, #4a4941);
            font: inherit;
            cursor: pointer;
            overflow: visible;
          }

          .microstateMarker[hidden] {
            display: none;
          }

          .microstateLabel {
            position: absolute;
            bottom: calc(100% + 5px);
            left: 50%;
            z-index: 1;
            color: var(--atlas-text, #4a4941);
            font-size: 13px;
            font-weight: 700;
            line-height: 1;
            white-space: nowrap;
            pointer-events: none;
            transform: translateX(-50%);
            -webkit-text-stroke: 3px var(--atlas-text-halo, #f4efdf);
            paint-order: stroke fill;
          }

          .microstatePin {
            display: block;
            box-sizing: border-box;
            width: 26px;
            height: 26px;
            border: 3px solid var(--marker-active, #3f815b);
            border-radius: 50%;
            background: var(--atlas-text-halo, #f4efdf);
            pointer-events: none;
            transition:
              background 120ms ease,
              transform 120ms ease;
          }

          .microstateMarker:hover .microstatePin,
          .microstateMarker:focus-visible .microstatePin {
            background: var(--marker-hover, #8fc9a7);
            transform: scale(1.06);
          }

          .microstateMarker:focus-visible {
            outline: none;
          }

          .microstateMarker:focus-visible .microstatePin {
            outline: 3px solid var(--marker-active-hover, #276944);
            outline-offset: 2px;
          }

          .microstateMarker.selected .microstatePin {
            background: var(--marker-active, #4f9a6f);
          }

          .microstateMarker.selected[data-visit-type="passed"] .microstatePin {
            background:
              repeating-linear-gradient(
                135deg,
                rgba(20, 20, 20, 0.32) 0 2px,
                transparent 2px 6px
              ),
              var(--marker-active, #4f9a6f);
          }

          .microstateMarker.selected[data-visit-type="lived"] .microstatePin {
            background:
              radial-gradient(
                circle at 2px 2px,
                rgba(20, 20, 20, 0.38) 0 1.25px,
                transparent 1.5px
              ) 0 0 / 6px 6px,
              var(--marker-active, #4f9a6f);
          }

          .microstateMarker.selected:hover .microstatePin,
          .microstateMarker.selected:focus-visible .microstatePin {
            background: var(--marker-active-hover, #276944);
          }

          .microstateMarker.selected[data-visit-type="passed"]:hover .microstatePin,
          .microstateMarker.selected[data-visit-type="passed"]:focus-visible .microstatePin {
            background:
              repeating-linear-gradient(
                135deg,
                rgba(20, 20, 20, 0.32) 0 2px,
                transparent 2px 6px
              ),
              var(--marker-active-hover, #276944);
          }

          .microstateMarker.selected[data-visit-type="lived"]:hover .microstatePin,
          .microstateMarker.selected[data-visit-type="lived"]:focus-visible .microstatePin {
            background:
              radial-gradient(
                circle at 2px 2px,
                rgba(20, 20, 20, 0.38) 0 1.25px,
                transparent 1.5px
              ) 0 0 / 6px 6px,
              var(--marker-active-hover, #276944);
          }

        `}</style>
      </>
    );
};

export default WorldMap;
