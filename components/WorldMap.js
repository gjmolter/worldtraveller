import { useEffect, useImperativeHandle, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { getCountryById, microstateCallouts } from "../utils/mapData";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const WORLD_BOUNDS = [
  [-179, -58],
  [179, 82],
];

const PAPER_ATLAS_STYLE = "https://tiles.openfreemap.org/styles/positron";
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const COUNTRY_SOURCE = "maptiler-countries";
const COUNTRY_SOURCE_LAYER = "administrative";
const MARITIME_SOURCE = "maritime-country-targets";
const MARITIME_HIT_LAYER = "maritime-country-hit-area";
const MARITIME_ACTIVE_LAYER = "maritime-country-active";
const MARITIME_ACTIVE_OUTLINE_LAYER = "maritime-country-active-outline";
const MARITIME_HOVER_LAYER = "maritime-country-hover";
const MARITIME_OUTLINE_LAYER = "maritime-country-outline";

const paperPalette = {
  background: "#cfdcd8",
  land: "#e9e3cf",
  green: "#dce2cc",
  buildings: "#d8cfb8",
  water: "#cfdcd8",
  roads: "#c7bda7",
  boundaries: "#aaa18b",
  text: "#4a4941",
  textHalo: "#f4efdf",
};

function countryFill(selected) {
  const selectedCodes = selected.map((code) => code.toUpperCase());
  const isSelected = selectedCodes.length
    ? ["in", ["get", "iso_a2"], ["literal", selectedCodes]]
    : false;

  return [
    "case",
    [
      "all",
      ["boolean", ["feature-state", "hover"], false],
      isSelected,
    ],
    "#276944",
    ["boolean", ["feature-state", "hover"], false],
    "#8fc9a7",
    isSelected,
    "#4f9a6f",
    paperPalette.land,
  ];
}

function marineColor(selected) {
  const selectedCodes = selected.map((code) => code.toLowerCase());
  const isSelected = selectedCodes.length
    ? [
        "any",
        ["in", ["get", "code1"], ["literal", selectedCodes]],
        ["in", ["get", "code2"], ["literal", selectedCodes]],
        ["in", ["get", "code3"], ["literal", selectedCodes]],
      ]
    : false;

  return [
    "case",
    isSelected,
    "#276944",
    "#8fc9a7",
  ];
}

function marineSelectedFilter(selected) {
  const selectedCodes = selected.map((code) => code.toLowerCase());
  if (!selectedCodes.length) {
    return ["==", ["get", "code1"], "__no_maritime_selection__"];
  }

  return [
    "any",
    ["in", ["get", "code1"], ["literal", selectedCodes]],
    ["in", ["get", "code2"], ["literal", selectedCodes]],
    ["in", ["get", "code3"], ["literal", selectedCodes]],
  ];
}

function countriesForMarineFeature(feature) {
  return [1, 2, 3]
    .map((position) => {
      const code = feature?.properties?.[`code${position}`];
      return code ? getCountryById(code) : null;
    })
    .filter(Boolean)
    .filter(
      (country, index, all) =>
        all.findIndex(({ id }) => id === country.id) === index,
    );
}

function closestCountryToPoint(countries, point) {
  if (!countries.length) return null;
  if (!point) return countries[0];

  const longitudeScale = Math.cos((point.lat * Math.PI) / 180);
  return countries.reduce((closest, country) => {
    if (!country.coordinates) return closest;

    const longitudeDifference =
      Math.abs(country.coordinates[0] - point.lng) % 360;
    const wrappedLongitudeDifference = Math.min(
      longitudeDifference,
      360 - longitudeDifference,
    );
    const latitudeDifference = country.coordinates[1] - point.lat;
    const distance =
      (wrappedLongitudeDifference * longitudeScale) ** 2 +
      latitudeDifference ** 2;

    return !closest || distance < closest.distance
      ? { country, distance }
      : closest;
  }, null)?.country;
}

function applyPaperAtlasTheme(map) {
  const layers = map.getStyle().layers || [];

  layers.forEach((layer) => {
    const id = layer.id.toLowerCase();

    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", paperPalette.background);
      return;
    }

    if (layer.type === "fill") {
      if (/water/.test(id)) {
        map.setPaintProperty(layer.id, "fill-color", paperPalette.water);
      } else {
        map.setPaintProperty(layer.id, "fill-opacity", 0);
      }
      return;
    }

    if (layer.type === "line") {
      if (/water|river|stream/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", paperPalette.water);
      } else if (/boundary|border/.test(id)) {
        map.setPaintProperty(layer.id, "line-opacity", 0);
      } else if (/road|street|bridge|tunnel|rail/.test(id)) {
        map.setPaintProperty(layer.id, "line-color", paperPalette.roads);
      }
      return;
    }

    if (layer.type === "symbol") {
      if (layer.layout?.["text-field"]) {
        map.setPaintProperty(layer.id, "text-color", paperPalette.text);
        map.setPaintProperty(layer.id, "text-halo-color", paperPalette.textHalo);
        map.setPaintProperty(layer.id, "text-halo-width", 1);
      }

      if (layer.layout?.["icon-image"]) {
        map.setPaintProperty(layer.id, "icon-opacity", 0.72);
      }
    }
  });
}

const WorldMap = ({
  controlRef,
  selected,
  onCountryClick,
  onCountryEnter,
  onCountryLeave,
  onZoom,
}) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const hoveredIdRef = useRef(null);
    const marineHoveredIdRef = useRef(null);
    const calloutElementsRef = useRef(new Map());
    const callbacksRef = useRef({
      onCountryClick,
      onCountryEnter,
      onCountryLeave,
      onZoom,
    });

    callbacksRef.current = {
      onCountryClick,
      onCountryEnter,
      onCountryLeave,
      onZoom,
    };

    useEffect(() => {
      if (!containerRef.current) return undefined;

      let calloutMarkers = [];
      let updateCalloutVisibility;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: PAPER_ATLAS_STYLE,
        center: [0, 12],
        zoom: 1.15,
        minZoom: -0.75,
        maxZoom: 8,
        attributionControl: { compact: true },
        preserveDrawingBuffer: true,
        renderWorldCopies: true,
      });

      mapRef.current = map;

      map.on("load", () => {
        applyPaperAtlasTheme(map);

        if (!MAPTILER_KEY) {
          console.error(
            "NEXT_PUBLIC_MAPTILER_KEY is required for country highlighting",
          );
          return;
        }

        const firstMapFillLayer = map
          .getStyle()
          .layers?.find((layer) => layer.type === "fill")?.id;

        map.addSource(COUNTRY_SOURCE, {
          type: "vector",
          url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${MAPTILER_KEY}`,
          promoteId: { [COUNTRY_SOURCE_LAYER]: "iso_a2" },
        });
        map.addLayer(
          {
            id: "country-fill",
            type: "fill",
            source: COUNTRY_SOURCE,
            "source-layer": COUNTRY_SOURCE_LAYER,
            filter: [
              "all",
              ["==", ["get", "level"], 0],
              ["has", "iso_a2"],
            ],
            paint: {
              "fill-color": countryFill(selected),
              "fill-outline-color": paperPalette.boundaries,
            },
          },
          firstMapFillLayer,
        );

        map.addSource(MARITIME_SOURCE, {
          type: "geojson",
          data: "/data/maritime-country-targets.geojson",
          attribution:
            '<a href="https://www.marineregions.org/" target="_blank">Marine Regions EEZ v12 (CC BY 4.0)</a>',
        });
        map.addLayer(
          {
            id: MARITIME_HIT_LAYER,
            type: "fill",
            source: MARITIME_SOURCE,
            paint: {
              "fill-color": "rgba(0, 0, 0, 0.01)",
              "fill-opacity": 0.01,
            },
          },
        );
        map.addLayer({
          id: MARITIME_ACTIVE_LAYER,
          type: "fill",
          source: MARITIME_SOURCE,
          filter: marineSelectedFilter(selected),
          paint: {
            "fill-color": "#4f9a6f",
            "fill-opacity": 0.16,
          },
        });
        map.addLayer({
          id: MARITIME_ACTIVE_OUTLINE_LAYER,
          type: "line",
          source: MARITIME_SOURCE,
          filter: marineSelectedFilter(selected),
          paint: {
            "line-color": "#4f9a6f",
            "line-opacity": 0.38,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              0.8,
              5,
              1.4,
            ],
          },
        });
        map.addLayer(
          {
            id: MARITIME_HOVER_LAYER,
            type: "fill",
            source: MARITIME_SOURCE,
            filter: ["==", ["get", "code1"], "__no_maritime_hover__"],
            paint: {
              "fill-color": marineColor(selected),
              "fill-opacity": 0.58,
            },
          },
        );
        map.addLayer(
          {
            id: MARITIME_OUTLINE_LAYER,
            type: "line",
            source: MARITIME_SOURCE,
            filter: ["==", ["get", "code1"], "__no_maritime_hover__"],
            paint: {
              "line-color": marineColor(selected),
              "line-opacity": 1,
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                1,
                1.5,
                5,
                2.5,
              ],
            },
          },
        );

        calloutMarkers = microstateCallouts.map((country) => {
          const element = document.createElement("button");
          element.type = "button";
          element.className = "microstateCallout";
          element.textContent = country.name;
          element.setAttribute("aria-label", `Select ${country.name}`);
          element.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            callbacksRef.current.onCountryClick?.(country.id);
          });
          element.addEventListener("mouseenter", () => {
            callbacksRef.current.onCountryEnter?.(country.name);
          });
          element.addEventListener("mouseleave", () => {
            callbacksRef.current.onCountryLeave?.();
          });
          element.classList.toggle("selected", selected.includes(country.id));
          calloutElementsRef.current.set(country.id, element);

          return new maplibregl.Marker({ element, anchor: "bottom" })
            .setLngLat(country.coordinates)
            .addTo(map);
        });

        updateCalloutVisibility = () => {
          const visible = map.getZoom() >= 4.25;
          calloutElementsRef.current.forEach((element) => {
            element.hidden = !visible;
          });
        };
        updateCalloutVisibility();
        map.on("zoom", updateCalloutVisibility);

        map.fitBounds(WORLD_BOUNDS, { padding: 20, duration: 0 });

        map.on("mousemove", "country-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;

          const featureId = feature.id;
          if (featureId == null) return;
          if (featureId !== hoveredIdRef.current) {
            if (hoveredIdRef.current) {
              map.setFeatureState(
                {
                  source: COUNTRY_SOURCE,
                  sourceLayer: COUNTRY_SOURCE_LAYER,
                  id: hoveredIdRef.current,
                },
                { hover: false },
              );
            }

            hoveredIdRef.current = featureId;
            map.setFeatureState(
              {
                source: COUNTRY_SOURCE,
                sourceLayer: COUNTRY_SOURCE_LAYER,
                id: featureId,
              },
              { hover: true },
            );
          }

          map.getCanvas().style.cursor = "pointer";

          const code = feature.properties.iso_a2.toLowerCase();
          callbacksRef.current.onCountryEnter?.(
            getCountryById(code)?.name || feature.properties.name,
          );
        });

        map.on("mouseleave", "country-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredIdRef.current) {
            map.setFeatureState(
              {
                source: COUNTRY_SOURCE,
                sourceLayer: COUNTRY_SOURCE_LAYER,
                id: hoveredIdRef.current,
              },
              { hover: false },
            );
          }
          hoveredIdRef.current = null;
          callbacksRef.current.onCountryLeave?.();
        });

        map.on("click", "country-fill", (event) => {
          const code = event.features?.[0]?.properties?.iso_a2?.toLowerCase();
          if (getCountryById(code)) callbacksRef.current.onCountryClick?.(code);
        });

        const clearMarineHover = () => {
          if (map.getLayer(MARITIME_HOVER_LAYER)) {
            map.setFilter(MARITIME_HOVER_LAYER, [
              "==",
              ["get", "code1"],
              "__no_maritime_hover__",
            ]);
          }
          if (map.getLayer(MARITIME_OUTLINE_LAYER)) {
            map.setFilter(MARITIME_OUTLINE_LAYER, [
              "==",
              ["get", "code1"],
              "__no_maritime_hover__",
            ]);
          }
          marineHoveredIdRef.current = null;
        };

        map.on("mousemove", MARITIME_HIT_LAYER, (event) => {
          const landFeature = map.queryRenderedFeatures(event.point, {
            layers: ["country-fill"],
          })[0];
          const landCode = landFeature?.properties?.iso_a2?.toLowerCase();
          if (getCountryById(landCode)) {
            clearMarineHover();
            return;
          }

          const feature = event.features?.[0];
          if (!feature || feature.id == null) return;

          if (feature.id !== marineHoveredIdRef.current) {
            clearMarineHover();
            marineHoveredIdRef.current = feature.id;
            const hoverFilter = [
              "all",
              ["==", ["get", "code1"], feature.properties.code1 || ""],
              ["==", ["get", "code2"], feature.properties.code2 || ""],
              ["==", ["get", "code3"], feature.properties.code3 || ""],
            ];
            map.setFilter(MARITIME_HOVER_LAYER, hoverFilter);
            map.setFilter(MARITIME_OUTLINE_LAYER, hoverFilter);
          }

          const choices = countriesForMarineFeature(feature);
          const closestCountry = closestCountryToPoint(choices, event.lngLat);
          map.getCanvas().style.cursor = "pointer";
          callbacksRef.current.onCountryEnter?.(closestCountry?.name || "");
        });

        map.on("mouseleave", MARITIME_HIT_LAYER, () => {
          map.getCanvas().style.cursor = "";
          clearMarineHover();
          callbacksRef.current.onCountryLeave?.();
        });

        map.on("click", MARITIME_HIT_LAYER, (event) => {
          const landFeature = map.queryRenderedFeatures(event.point, {
            layers: ["country-fill"],
          })[0];
          const landCode = landFeature?.properties?.iso_a2?.toLowerCase();
          if (getCountryById(landCode)) return;

          const choices = countriesForMarineFeature(event.features?.[0]);
          const closestCountry = closestCountryToPoint(choices, event.lngLat);
          if (closestCountry) {
            callbacksRef.current.onCountryClick?.(closestCountry.id);
          }
        });
      });

      map.on("error", (event) => {
        console.error("World map error", event.error);
      });

      map.on("zoom", () => callbacksRef.current.onZoom?.(map.getZoom()));

      return () => {
        if (updateCalloutVisibility) {
          map.off("zoom", updateCalloutVisibility);
        }
        calloutMarkers.forEach((marker) => marker.remove());
        calloutElementsRef.current.clear();
        map.remove();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.getLayer("country-fill")) return;
      map.setPaintProperty("country-fill", "fill-color", countryFill(selected));
      if (map.getLayer(MARITIME_ACTIVE_LAYER)) {
        map.setFilter(
          MARITIME_ACTIVE_LAYER,
          marineSelectedFilter(selected),
        );
      }
      if (map.getLayer(MARITIME_ACTIVE_OUTLINE_LAYER)) {
        map.setFilter(
          MARITIME_ACTIVE_OUTLINE_LAYER,
          marineSelectedFilter(selected),
        );
      }
      if (map.getLayer(MARITIME_HOVER_LAYER)) {
        map.setPaintProperty(
          MARITIME_HOVER_LAYER,
          "fill-color",
          marineColor(selected),
        );
      }
      if (map.getLayer(MARITIME_OUTLINE_LAYER)) {
        map.setPaintProperty(
          MARITIME_OUTLINE_LAYER,
          "line-color",
          marineColor(selected),
        );
      }
      calloutElementsRef.current.forEach((element, code) => {
        element.classList.toggle("selected", selected.includes(code));
      });
    }, [selected]);

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
        />

        <style jsx global>{`
          .microstateCallout {
            min-height: 40px;
            padding: 0 12px;
            border: 1px solid ${paperPalette.boundaries};
            border-radius: 999px;
            background: ${paperPalette.textHalo};
            box-shadow: 0 2px 8px rgba(34, 42, 35, 0.24);
            color: ${paperPalette.text};
            cursor: pointer;
            font: 700 12px/1 system-ui, sans-serif;
            white-space: nowrap;
          }

          .microstateCallout:hover,
          .microstateCallout:focus-visible {
            background: #8fc9a7;
            outline: none;
          }

          .microstateCallout.selected {
            background: #4f9a6f;
            border-color: #3f815b;
            color: #fff;
          }

          .microstateCallout.selected:hover,
          .microstateCallout.selected:focus-visible {
            background: #276944;
          }

        `}</style>
      </>
    );
};

export default WorldMap;
