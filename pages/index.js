import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

//Components
import Tooltip from "../components/Tooltip";
import Toast from "../components/Toast";
import ComboBox from "../components/Combobox";
import TravelProgressSidebar from "../components/TravelProgressSidebar";
import AboutModal from "../components/AboutModal";
import SettingsPanel from "../components/SettingsPanel";
import PlaceFlag from "../components/PlaceFlag";
import VisitTypeSelector from "../components/VisitTypeSelector";

const WorldMap = dynamic(() => import("../components/WorldMap"), {
  ssr: false,
});

//Data
import { getCountryById, getCountryByName } from "../utils/mapData";
import {
  associatedPlacesFor,
  associatedStateFor,
  displayStateFor,
  projectCountrySelection,
} from "../utils/territoryData";
import {
  getSubdivisionById,
  getSubdivisionsForParent,
  subdivisions,
} from "../utils/subdivisionData";
import {
  getMapPalette,
  getVisitTypeColor,
  mapColorOptions,
} from "../utils/mapColors";
import {
  derivePlaceSelection,
  subdivisionThresholdSteps as getSubdivisionThresholdSteps,
} from "../utils/placeSelection.mjs";
import { createLocalAtlasRepository } from "../utils/atlasRepository.mjs";
import { DEFAULT_ATLAS_PREFERENCES } from "../utils/atlasState.mjs";
import {
  createShareToken,
  createShareUrl,
  parseShareToken,
  SHARE_QUERY_PARAMETER,
} from "../utils/shareState.mjs";
import {
  DEFAULT_VISIT_TYPE,
  normalizeVisitType,
  strongestVisitType,
  visitTypeCountsAtLevel,
  visitTypeLabel,
} from "../utils/visitTypes.mjs";

//Icons
import {
  FiShare,
  FiInfo,
  FiX,
  FiPlus,
  FiMinus,
  FiChevronUp,
  FiChevronDown,
  FiSettings,
  FiBarChart2,
} from "react-icons/fi";

const countryArrowsEnabled = {
  fontSize: "30px",
  margin: "8px 5px",
  color: "white",
  cursor: "pointer",
};
const countryArrowsDisabled = {
  fontSize: "30px",
  margin: "8px 5px",
  color: "gray",
};
const minZoom = -0.75;
const maxZoom = 8;

function withoutKeys(record, keys) {
  const removed = new Set(keys);
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !removed.has(key)),
  );
}

const Home = () => {
  // Country List
  const [selected, setSelected] = useState([]);
  const [selectedSubdivisions, setSelectedSubdivisions] = useState([]);
  const [countryVisitTypes, setCountryVisitTypes] = useState({});
  const [subdivisionVisitTypes, setSubdivisionVisitTypes] = useState({});

  // Display Helpers
  const [scale, setScale] = useState(1.15);
  const [hoveredCountryName, setHoveredCountryName] = useState("");
  const [hoveredFlagName, setHoveredFlagName] = useState("");
  const [toast, setToast] = useState("");
  const [chevronUp, setChevronUp] = useState(countryArrowsDisabled);
  const [chevronDown, setChevronDown] = useState(countryArrowsDisabled);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareImage, setShareImage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progressSidebarOpen, setProgressSidebarOpen] = useState(false);
  const [placeGrouping, setPlaceGrouping] = useState(
    DEFAULT_ATLAS_PREFERENCES.placeGrouping,
  );
  const [progressMode, setProgressMode] = useState(
    DEFAULT_ATLAS_PREFERENCES.progressMode,
  );
  const [eezDisplayMode, setEezDisplayMode] = useState(
    DEFAULT_ATLAS_PREFERENCES.eezDisplayMode,
  );
  const [colorMode, setColorMode] = useState(
    DEFAULT_ATLAS_PREFERENCES.colorMode,
  );
  const [subdivisionAreaThreshold, setSubdivisionAreaThreshold] = useState(
    DEFAULT_ATLAS_PREFERENCES.subdivisionAreaThreshold,
  );
  const [mapTheme, setMapTheme] = useState(
    DEFAULT_ATLAS_PREFERENCES.mapTheme,
  );
  const [mapLabelDensity, setMapLabelDensity] = useState(
    DEFAULT_ATLAS_PREFERENCES.mapLabelDensity,
  );
  const [hoverOpacity, setHoverOpacity] = useState(
    DEFAULT_ATLAS_PREFERENCES.hoverOpacity,
  );
  const [selectionVisitType, setSelectionVisitType] = useState(
    DEFAULT_ATLAS_PREFERENCES.selectionVisitType,
  );
  const [statisticsVisitType, setStatisticsVisitType] = useState(
    DEFAULT_ATLAS_PREFERENCES.statisticsVisitType,
  );
  const [travelDataSource, setTravelDataSource] = useState("pending");
  const [travelSummary, setTravelSummary] = useState({
    label: "World",
    percentage: "0",
  });

  // Refs
  const countryListRef = useRef();
  const shareWrapperRef = useRef();
  const mapRef = useRef();
  const toastTimeoutRef = useRef(null);
  const closeAbout = useCallback(() => setAboutOpen(false), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const subdivisionThresholdSteps = useMemo(() => {
    return getSubdivisionThresholdSteps(subdivisions, getCountryById);
  }, []);
  const {
    baseSelected,
    countrySelection,
    effectiveSelectedSubdivisions,
    fullySelectedCountries,
    partiallySelectedCountries,
    selectedListEntries,
    subdivisionParentIds,
    visibleSubdivisionParentIds,
    visibleSubdivisionParentIdSet,
  } = useMemo(() => derivePlaceSelection({
    displayStateFor,
    getCountryById,
    getSubdivisionById,
    getSubdivisionsForParent,
    placeGrouping,
    projectCountrySelection,
    selected,
    selectedSubdivisions,
    subdivisionAreaThreshold,
    subdivisions,
  }), [
    placeGrouping,
    selected,
    selectedSubdivisions,
    subdivisionAreaThreshold,
  ]);
  const mapPalette = getMapPalette(colorMode);
  const appColorMode = colorMode === "country" ? "green" : colorMode;
  const appPalette = getMapPalette(appColorMode);
  const visitTypeByPlaceId = useMemo(() => ({
    ...countryVisitTypes,
    ...Object.fromEntries(effectiveSelectedSubdivisions.map((id) => {
      const parentId = getSubdivisionById(id)?.parentId;
      return [
        id,
        subdivisionVisitTypes[id] ||
          countryVisitTypes[parentId] ||
          DEFAULT_VISIT_TYPE,
      ];
    })),
  }), [
    countryVisitTypes,
    effectiveSelectedSubdivisions,
    subdivisionVisitTypes,
  ]);
  const mapCountryVisitTypes = useMemo(() => Object.fromEntries(
    countrySelection.mapIds.map((mapId) => {
      const displayId = displayStateFor(mapId, placeGrouping);
      const groupedVisitTypes = [
        ...selected
          .filter((countryId) =>
            displayStateFor(countryId, placeGrouping) === displayId)
          .map((countryId) =>
            countryVisitTypes[countryId] || DEFAULT_VISIT_TYPE),
        ...selectedSubdivisions
          .filter((subdivisionId) => {
            const parentId = getSubdivisionById(subdivisionId)?.parentId;
            return parentId &&
              displayStateFor(parentId, placeGrouping) === displayId;
          })
          .map((subdivisionId) =>
            subdivisionVisitTypes[subdivisionId] || DEFAULT_VISIT_TYPE),
      ];
      return [
        mapId,
        groupedVisitTypes.length
          ? strongestVisitType(groupedVisitTypes)
          : countryVisitTypes[mapId] || DEFAULT_VISIT_TYPE,
      ];
    }),
  ), [
    countrySelection.mapIds,
    countryVisitTypes,
    placeGrouping,
    selected,
    selectedSubdivisions,
    subdivisionVisitTypes,
  ]);
  const mapSubdivisionVisitTypes = useMemo(() => Object.fromEntries(
    effectiveSelectedSubdivisions.map((id) => [
      id,
      visitTypeByPlaceId[id] || DEFAULT_VISIT_TYPE,
    ]),
  ), [effectiveSelectedSubdivisions, visitTypeByPlaceId]);
  const maritimeVisitTypes = useMemo(() => ({
    ...mapCountryVisitTypes,
    ...mapSubdivisionVisitTypes,
  }), [mapCountryVisitTypes, mapSubdivisionVisitTypes]);
  const statisticsSelections = useMemo(() => ({
    countries: selected.filter((id) => visitTypeCountsAtLevel(
      countryVisitTypes[id] || DEFAULT_VISIT_TYPE,
      statisticsVisitType,
    )),
    subdivisions: selectedSubdivisions.filter((id) => {
      const parentId = getSubdivisionById(id)?.parentId;
      return visitTypeCountsAtLevel(
        subdivisionVisitTypes[id] ||
          countryVisitTypes[parentId] ||
          DEFAULT_VISIT_TYPE,
        statisticsVisitType,
      );
    }),
  }), [
    countryVisitTypes,
    selected,
    selectedSubdivisions,
    statisticsVisitType,
    subdivisionVisitTypes,
  ]);
  useEffect(() => {
    const validation = {
      isValidCountry: (id) => Boolean(getCountryById(id)),
      isValidSubdivision: (id) => Boolean(getSubdivisionById(id)),
    };
    const sharedState = parseShareToken(
      new URLSearchParams(window.location.search).get(SHARE_QUERY_PARAMETER),
      validation,
    );
    const localState = createLocalAtlasRepository(window.localStorage)
      .load(validation);
    const savedTravelState = sharedState?.travelState || localState.travelState;
    const savedPreferences = localState.preferences;

    setSelected(savedTravelState.selected);
    setSelectedSubdivisions(savedTravelState.selectedSubdivisions);
    setCountryVisitTypes(savedTravelState.countryVisitTypes);
    setSubdivisionVisitTypes(savedTravelState.subdivisionVisitTypes);
    setPlaceGrouping(savedPreferences.placeGrouping);
    setProgressMode(savedPreferences.progressMode);
    setEezDisplayMode(savedPreferences.eezDisplayMode);
    setColorMode(savedPreferences.colorMode);
    setSubdivisionAreaThreshold(savedPreferences.subdivisionAreaThreshold);
    setMapTheme(savedPreferences.mapTheme);
    setMapLabelDensity(savedPreferences.mapLabelDensity);
    setHoverOpacity(savedPreferences.hoverOpacity);
    setSelectionVisitType(savedPreferences.selectionVisitType);
    setStatisticsVisitType(savedPreferences.statisticsVisitType);
    setProgressSidebarOpen(savedPreferences.progressSidebarOpen);

    if (sharedState) {
      setPlaceGrouping(sharedState.preferences.placeGrouping);
      setProgressMode(sharedState.preferences.progressMode);
      setStatisticsVisitType(sharedState.preferences.statisticsVisitType);
      if (mapColorOptions.some(
        ({ id }) => id === sharedState.preferences.colorMode,
      )) {
        setColorMode(sharedState.preferences.colorMode);
      }
      setMapTheme(sharedState.preferences.mapTheme);
    }
    setTravelDataSource(sharedState ? "shared" : "local");
  }, []);

  useEffect(() => {
    if (travelDataSource !== "local") return;
    createLocalAtlasRepository(window.localStorage).save({
      travelState: {
        selected,
        selectedSubdivisions,
        countryVisitTypes,
        subdivisionVisitTypes,
      },
      preferences: {
        placeGrouping,
        progressMode,
        eezDisplayMode,
        colorMode,
        subdivisionAreaThreshold,
        mapTheme,
        mapLabelDensity,
        hoverOpacity,
        selectionVisitType,
        statisticsVisitType,
        progressSidebarOpen,
      },
    });
  }, [
    colorMode,
    countryVisitTypes,
    eezDisplayMode,
    hoverOpacity,
    mapLabelDensity,
    mapTheme,
    placeGrouping,
    progressMode,
    progressSidebarOpen,
    selected,
    selectedSubdivisions,
    selectionVisitType,
    statisticsVisitType,
    subdivisionAreaThreshold,
    subdivisionVisitTypes,
    travelDataSource,
  ]);

  useEffect(() => {
    const themeVariables = {
      "--accent": appPalette.active,
      "--accent-soft": appPalette.hover,
      "--accent-strong": appPalette.activeHover,
      "--accent-faint": appPalette.faint,
      "--accent-on-dark": appPalette.hover,
      "--visit-passed": getVisitTypeColor(appColorMode, "passed"),
      "--visit-passed-hover": getVisitTypeColor(
        appColorMode,
        "passed",
        "hover",
      ),
      "--visit-visited": getVisitTypeColor(appColorMode, "visited"),
      "--visit-visited-hover": getVisitTypeColor(
        appColorMode,
        "visited",
        "hover",
      ),
      "--visit-lived": getVisitTypeColor(appColorMode, "lived"),
      "--visit-lived-hover": getVisitTypeColor(
        appColorMode,
        "lived",
        "hover",
      ),
    };
    for (const [property, value] of Object.entries(themeVariables)) {
      document.documentElement.style.setProperty(property, value);
    }
  }, [
    appColorMode,
    appPalette.active,
    appPalette.activeHover,
    appPalette.faint,
    appPalette.hover,
  ]);

  const changeProgressSidebarOpen = (nextOpen) => {
    setProgressSidebarOpen(nextOpen);
  };

  /* Country List Scolling */

  // Change button styles according to list size
  function chevronScroll() {
    let listEl = countryListRef.current;
    var maxScrollTop = listEl.scrollHeight - listEl.offsetHeight;

    setChevronUp(
      maxScrollTop > 0 && listEl.scrollTop !== 0
        ? countryArrowsEnabled
        : countryArrowsDisabled
    );
    setChevronDown(
      maxScrollTop > 0 && listEl.scrollTop !== maxScrollTop
        ? countryArrowsEnabled
        : countryArrowsDisabled
    );
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => chevronScroll());
    return () => window.cancelAnimationFrame(frame);
  }, [selectedListEntries.length]);

  // Scroll buttons
  const scrollUp = () =>
    countryListRef.current.scrollBy({ top: -100, behavior: "smooth" });
  const scrollDown = () =>
    countryListRef.current.scrollBy({ top: 100, behavior: "smooth" });

  /* Zoom */

  const scaleUp = () => mapRef.current?.zoomIn();
  const scaleDown = () => mapRef.current?.zoomOut();

  /* Toasts */

  // Hide Toasts after 2s
  useEffect(() => {
    if (!toast) return undefined;
    window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(""), 2000);
    return () => window.clearTimeout(toastTimeoutRef.current);
  }, [toast]);

  /* Main Map Functions */

  const addCountry = (id) => {
    setSelected((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setCountryVisitTypes((current) => ({
      ...current,
      [id]: selectionVisitType,
    }));
    chevronScroll();
  };

  const removeCountry = (id) => {
    setSelected((current) =>
      current.filter((countryId) => countryId !== id),
    );
    setSelectedSubdivisions((current) =>
      current.filter(
        (subdivisionId) => getSubdivisionById(subdivisionId)?.parentId !== id,
      ),
    );
    setCountryVisitTypes((current) => withoutKeys(current, [id]));
    setSubdivisionVisitTypes((current) => withoutKeys(
      current,
      getSubdivisionsForParent(id).map(({ id: subdivisionId }) =>
        subdivisionId),
    ));
    chevronScroll();
  };

  const changeSelectionVisitType = (visitType) => {
    const normalized = normalizeVisitType(visitType);
    setSelectionVisitType(normalized);
  };

  const changePlaceGrouping = (mode) => {
    setPlaceGrouping(mode);
    setToast(
      {
        all: "Tracking every place separately",
        standard: "Grouping subdivisions by country",
        sovereign: "Grouping by sovereign state",
      }[mode],
    );
  };

  const changeProgressMode = (mode) => {
    setProgressMode(mode);
    setToast(mode === "land" ? "Using land area" : "Counting places equally");
  };

  const changeStatisticsVisitType = (visitType) => {
    const normalized = normalizeVisitType(visitType);
    setStatisticsVisitType(normalized);
    setToast(
      {
        passed: "Statistics include every travel level",
        visited: "Statistics include visited and lived places",
        lived: "Statistics include only places lived in",
      }[normalized],
    );
  };

  const changeEezDisplayMode = (mode) => {
    setEezDisplayMode(mode);
    setToast(
      {
        none: "Maritime overlays hidden",
        aids: "Showing maritime selection aids",
        all: "Showing all maritime zones",
      }[mode],
    );
  };

  const changeColorMode = (mode) => {
    setColorMode(mode);
    setToast(
      mode === "country"
        ? "Theme: Flag-led"
        : `Theme: ${mapColorOptions.find((option) => option.id === mode)?.label || "Forest"}`,
    );
  };

  const changeSubdivisionAreaThreshold = (threshold) => {
    setSubdivisionAreaThreshold(threshold);
    const visibleCount = [...new Set(subdivisions.map(({ parentId }) => parentId))]
      .filter(
        (parentId) => (getCountryById(parentId)?.land || 0) >= threshold,
      ).length;
    setToast(
      visibleCount
        ? `Breaking down ${visibleCount} supported countries`
        : "Country subdivisions hidden",
    );
  };

  const changeMapTheme = (theme) => {
    setMapTheme(theme);
  };

  const changeMapLabelDensity = (density) => {
    setMapLabelDensity(density);
  };

  const changeHoverOpacity = (opacity) => {
    const nextOpacity = Math.min(100, Math.max(0, opacity));
    setHoverOpacity(nextOpacity);
  };

  /* Map Selection */

  // Country click handler
  const clickCountry = (id) => {
    if (placeGrouping === "sovereign") {
      const stateId = associatedStateFor(id);
      const groupIds = new Set(associatedPlacesFor(stateId));
      const selectedGroupIds = selected.filter((countryId) =>
        groupIds.has(countryId));
      const selectedGroupSubdivisions = selectedSubdivisions.filter(
        (subdivisionId) =>
          groupIds.has(getSubdivisionById(subdivisionId)?.parentId),
      );
      const groupSelected =
        selectedGroupIds.length > 0 || selectedGroupSubdivisions.length > 0;
      const groupUsesCurrentType = groupSelected && [
        ...selectedGroupIds.map((countryId) =>
          countryVisitTypes[countryId] || DEFAULT_VISIT_TYPE),
        ...selectedGroupSubdivisions.map((subdivisionId) =>
          subdivisionVisitTypes[subdivisionId] || DEFAULT_VISIT_TYPE),
      ].every((visitType) => visitType === selectionVisitType);

      setSelected((current) => [
        ...current.filter((countryId) => !groupIds.has(countryId)),
        ...(groupUsesCurrentType ? [] : groupIds),
      ]);
      setSelectedSubdivisions((current) =>
        current.filter((subdivisionId) =>
          !groupIds.has(getSubdivisionById(subdivisionId)?.parentId),
        ),
      );
      setCountryVisitTypes((current) => ({
        ...withoutKeys(current, groupIds),
        ...Object.fromEntries(
          groupUsesCurrentType
            ? []
            : [...groupIds].map((countryId) => [
                countryId,
                selectionVisitType,
              ]),
        ),
      }));
      setSubdivisionVisitTypes((current) => withoutKeys(
        current,
        selectedGroupSubdivisions,
      ));
      return;
    }

    const divisions = getSubdivisionsForParent(id);
    if (!divisions.length || !visibleSubdivisionParentIdSet.has(id)) {
      if (!selected.includes(id)) {
        addCountry(id);
      } else if (
        (countryVisitTypes[id] || DEFAULT_VISIT_TYPE) !== selectionVisitType
      ) {
        setCountryVisitTypes((current) => ({
          ...current,
          [id]: selectionVisitType,
        }));
      } else {
        removeCountry(id);
      }
      return;
    }

    const divisionIds = divisions.map((division) => division.id);
    if (selected.includes(id)) {
      if ((countryVisitTypes[id] || DEFAULT_VISIT_TYPE) !== selectionVisitType) {
        setCountryVisitTypes((current) => ({
          ...current,
          [id]: selectionVisitType,
        }));
      } else {
        removeCountry(id);
      }
      return;
    }
    const allSelected = divisionIds.every((divisionId) =>
      effectiveSelectedSubdivisions.includes(divisionId),
    );
    const allUseCurrentType = allSelected && divisionIds.every(
      (divisionId) =>
        (subdivisionVisitTypes[divisionId] || DEFAULT_VISIT_TYPE) ===
          selectionVisitType,
    );
    setSelected((current) => current.filter((countryId) => countryId !== id));
    setSelectedSubdivisions((current) =>
      allUseCurrentType
        ? current.filter((divisionId) =>
            getSubdivisionById(divisionId)?.parentId !== id,
          )
        : [...new Set([...current, ...divisionIds])],
    );
    setSubdivisionVisitTypes((current) =>
      allUseCurrentType
        ? withoutKeys(current, divisionIds)
        : {
            ...current,
            ...Object.fromEntries(divisionIds.map((divisionId) => [
              divisionId,
              selectionVisitType,
            ])),
          },
    );
  };

  const clickSubdivision = (id) => {
    const subdivision = getSubdivisionById(id);
    if (!subdivision) return;

    const parentWasSelected = selected.includes(subdivision.parentId);
    if (parentWasSelected) {
      const inheritedType =
        countryVisitTypes[subdivision.parentId] || DEFAULT_VISIT_TYPE;
      const divisionIds = getSubdivisionsForParent(subdivision.parentId)
        .map(({ id: divisionId }) => divisionId);
      const removeTarget = inheritedType === selectionVisitType;
      setSelected((current) =>
        current.filter((countryId) => countryId !== subdivision.parentId),
      );
      setCountryVisitTypes((current) =>
        withoutKeys(current, [subdivision.parentId]));
      setSelectedSubdivisions((current) => [
        ...new Set([
          ...current,
          ...divisionIds.filter((divisionId) =>
            !removeTarget || divisionId !== id),
        ]),
      ]);
      setSubdivisionVisitTypes((current) => ({
        ...current,
        ...Object.fromEntries(
          divisionIds
            .filter((divisionId) => !removeTarget || divisionId !== id)
            .map((divisionId) => [
              divisionId,
              divisionId === id ? selectionVisitType : inheritedType,
            ]),
        ),
      }));
      return;
    }

    const alreadySelected = selectedSubdivisions.includes(id);
    const usesCurrentType =
      (subdivisionVisitTypes[id] || DEFAULT_VISIT_TYPE) === selectionVisitType;
    setSelectedSubdivisions((current) =>
      alreadySelected && usesCurrentType
        ? current.filter((subdivisionId) => subdivisionId !== id)
        : [...new Set([...current, id])],
    );
    setSubdivisionVisitTypes((current) =>
      alreadySelected && usesCurrentType
        ? withoutKeys(current, [id])
        : { ...current, [id]: selectionVisitType },
    );
  };

  const removeSelectedListEntry = (entry) => {
    if (entry.type === "subdivision") {
      setSelectedSubdivisions((current) =>
        current.filter((subdivisionId) => subdivisionId !== entry.id),
      );
      setSubdivisionVisitTypes((current) => withoutKeys(current, [entry.id]));
      return;
    }

    const belongsToDisplayGroup = (countryId) =>
      displayStateFor(countryId, placeGrouping) === entry.id;
    const removedCountryIds = selected.filter(belongsToDisplayGroup);
    const removedSubdivisionIds = selectedSubdivisions.filter(
      (subdivisionId) => {
        const parentId = getSubdivisionById(subdivisionId)?.parentId;
        return parentId && belongsToDisplayGroup(parentId);
      },
    );
    setSelected((current) =>
      current.filter((countryId) => !belongsToDisplayGroup(countryId)),
    );
    setSelectedSubdivisions((current) =>
      current.filter((subdivisionId) => {
        const parentId = getSubdivisionById(subdivisionId)?.parentId;
        return !parentId || !belongsToDisplayGroup(parentId);
      }),
    );
    setCountryVisitTypes((current) =>
      withoutKeys(current, removedCountryIds));
    setSubdivisionVisitTypes((current) =>
      withoutKeys(current, removedSubdivisionIds));
  };

  const selectedListEntryName = (entry) => {
    if (entry.type === "subdivision") {
      return getSubdivisionById(entry.id)?.name || entry.id;
    }
    const country = getCountryById(entry.id);
    const directDivisions = getSubdivisionsForParent(entry.id);
    const selectedDivisionCount = directDivisions.filter(({ id }) =>
      selectedSubdivisions.includes(id),
    ).length;
    if (directDivisions.length && selectedDivisionCount) {
      return `${country?.name || entry.id} — ${selectedDivisionCount} of ${directDivisions.length} divisions`;
    }
    return placeGrouping === "sovereign"
      ? `${country?.name || entry.id} group`
      : country?.name || entry.id;
  };

  const selectedListEntryVisitType = (entry) => {
    if (entry.type === "subdivision") {
      const parentId = getSubdivisionById(entry.id)?.parentId;
      return subdivisionVisitTypes[entry.id] ||
        countryVisitTypes[parentId] ||
        DEFAULT_VISIT_TYPE;
    }
    const belongsToDisplayGroup = (countryId) =>
      displayStateFor(countryId, placeGrouping) === entry.id;
    const visitTypes = [
      ...selected
        .filter(belongsToDisplayGroup)
        .map((countryId) =>
          countryVisitTypes[countryId] || DEFAULT_VISIT_TYPE),
      ...selectedSubdivisions
        .filter((subdivisionId) => {
          const parentId = getSubdivisionById(subdivisionId)?.parentId;
          return parentId && belongsToDisplayGroup(parentId);
        })
        .map((subdivisionId) =>
          subdivisionVisitTypes[subdivisionId] || DEFAULT_VISIT_TYPE),
    ];
    return visitTypes.length
      ? strongestVisitType(visitTypes)
      : DEFAULT_VISIT_TYPE;
  };

  // Clear button handler
  const clearMap = () => {
    setSelected([]);
    setSelectedSubdivisions([]);
    setCountryVisitTypes({});
    setSubdivisionVisitTypes({});
    setToast("Cleared Map");
  };

  /* Share */

  // Share button handler
  async function shareMap() {
    setShareOpen(true);
    const shareToken = createShareToken({
      travelState: {
        selected,
        selectedSubdivisions,
        countryVisitTypes,
        subdivisionVisitTypes,
      },
      preferences: {
        placeGrouping,
        progressMode,
        statisticsVisitType,
        colorMode,
        mapTheme,
      },
    });
    setShareUrl(createShareUrl(window.location.origin, shareToken));
    setShareImage((await mapRef.current?.captureWorld()) || "");
    setShareText(
      `CPBR Atlas: I've travelled ${travelSummary.percentage}% of the ${travelSummary.label}`,
    );
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("Share link copied");
    } catch {
      setToast("Could not copy link");
    }
  }

  //Save image
  async function saveImage() {
    document.querySelector(".shareWrapper .closeShare").style.display = "none";
    try {
      const [{ toPng }, downloadModule] = await Promise.all([
        import("html-to-image"),
        import("downloadjs"),
      ]);
      const dataUrl = await toPng(shareWrapperRef.current);
      const download = downloadModule.default || downloadModule;
      download(dataUrl, "cpbr-atlas-map.png");
    } finally {
      document.querySelector(".shareWrapper .closeShare").style.display = "block";
    }
  }

  return (
    <div>
      <Head>
        <title>CPBR Atlas — Map your travels</title>
        <meta
          name="description"
          content="Explore the world, mark the places you've visited and compare your progress across regions, organizations and travel challenges."
        />
        <link rel="canonical" href="https://atlas.cpbr.digital/" />
        <meta property="og:title" content="CPBR Atlas" />
        <meta property="og:url" content="https://atlas.cpbr.digital/" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, 
     user-scalable=0"
        ></meta>
      </Head>
      <header>
        <div className="addCountry">
          <div className="plusContainer">
            <FiPlus />
          </div>
          <ComboBox
            selectedList={selected}
            selectedSubdivisions={effectiveSelectedSubdivisions}
            placeGrouping={placeGrouping}
            includeSubdivisions={placeGrouping === "all"}
            subdivisionParentIds={visibleSubdivisionParentIds}
            visitTypeByPlaceId={visitTypeByPlaceId}
            disabled={settingsOpen || aboutOpen || shareOpen}
            selectedPlace={(place) => {
              if (place.type === "subdivision") {
                clickSubdivision(place.id);
                setToast(`Updated ${place.name}`);
                return;
              }
              const countryId = getCountryByName(place.name).id.toLowerCase();
              clickCountry(countryId);
              setToast(`Updated ${place.name}`);
            }}
          />
          <VisitTypeSelector
            value={selectionVisitType}
            onChange={changeSelectionVisitType}
            disabled={settingsOpen || aboutOpen || shareOpen}
          />
        </div>
        <div className="atlasBrand" aria-label="CPBR Atlas — Capybara Atlas">
          <span>CPBR</span>
          <strong>ATLAS</strong>
          <small>Capybara Atlas</small>
        </div>
        <div className="headerActions">
          <button
            type="button"
            className="headerControlButton"
            aria-label={
              progressSidebarOpen
                ? "Close travel progress"
                : "Open travel progress"
            }
            aria-controls="travel-progress-sidebar"
            aria-expanded={progressSidebarOpen}
            data-tooltip="Travel progress"
            onClick={() => {
              setAboutOpen(false);
              setSettingsOpen(false);
              changeProgressSidebarOpen(!progressSidebarOpen);
            }}
          >
            <FiBarChart2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className="headerControlButton"
            aria-label="Map settings"
            aria-controls="map-settings-panel"
            aria-expanded={settingsOpen}
            data-tooltip="Settings"
            onClick={() => {
              setAboutOpen(false);
              changeProgressSidebarOpen(false);
              setSettingsOpen((isOpen) => !isOpen);
            }}
          >
            <FiSettings aria-hidden="true" />
          </button>
        </div>
      </header>
      <main>
        <div className="panels rightActions">
          <button
            type="button"
            className="mapControlButton mapActionButton infoButton"
            aria-label="About this map and its data sources"
            data-tooltip="Map information"
            onClick={() => {
              setSettingsOpen(false);
              setAboutOpen(true);
            }}
          >
            <FiInfo aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mapControlButton mapActionButton shareButton"
            aria-label="Share your travel map"
            data-tooltip="Share map"
            onClick={() => {
              setSettingsOpen(false);
              shareMap();
            }}
          >
            <FiShare aria-hidden="true" />
          </button>
        </div>
        <div
          className="panels removeCountries"
          style={{ left: baseSelected.length > 0 ? "-1px" : "-50px" }}
        >
          <FiChevronUp style={chevronUp} onClick={scrollUp} />
          <div ref={countryListRef} onScroll={chevronScroll}>
            {selectedListEntries.map((entry) => {
              const entryName = selectedListEntryName(entry);
              const entryVisitType = selectedListEntryVisitType(entry);
              return (
              <button
                type="button"
                key={`${entry.type}-${entry.id}`}
                className={`selectedPlaceFlag visitType-${entryVisitType}`}
                style={{
                  "--selected-visit-color": getVisitTypeColor(
                    colorMode,
                    entryVisitType,
                    "active",
                    entry.id,
                  ),
                }}
                aria-label={`Remove ${entryName} — ${visitTypeLabel(entryVisitType)}`}
                data-visit-type={visitTypeLabel(entryVisitType)}
                onClick={() => {
                  removeSelectedListEntry(entry);
                  setToast(`Removed ${entryName}`);
                  setHoveredFlagName("");
                }}
                onMouseOver={() => setHoveredFlagName(entryName)}
                onMouseLeave={() => setHoveredFlagName("")}
              >
                <PlaceFlag
                  placeId={entry.id}
                  width={26}
                />
              </button>
              );
            })}
          </div>
          <FiChevronDown style={chevronDown} onClick={scrollDown} />
        </div>
        <div className="panels zoom" aria-label="Map zoom controls">
          <button
            type="button"
            className="mapControlButton zoomButton"
            aria-label="Zoom out"
            aria-disabled={scale <= minZoom}
            data-tooltip="Zoom out"
            onClick={scale > minZoom ? scaleDown : undefined}
          >
            <FiMinus aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mapControlButton zoomButton"
            aria-label="Zoom in"
            aria-disabled={scale >= maxZoom}
            data-tooltip="Zoom in"
            onClick={scale < maxZoom ? scaleUp : undefined}
          >
            <FiPlus aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className={`panels mapControlButton clear ${
            baseSelected.length > 0 ? "isVisible" : ""
          }`}
          aria-label="Clear map"
          aria-hidden={baseSelected.length === 0}
          data-tooltip="Clear map"
          tabIndex={baseSelected.length > 0 ? 0 : -1}
          onClick={clearMap}
        >
          <FiX aria-hidden="true" />
        </button>

        <div
          className="mapWrapper"
          style={{
            "--map-active": mapPalette.active || "#4f9a6f",
            "--map-hover": mapPalette.hover || "#8fc9a7",
            "--map-active-hover": mapPalette.activeHover || "#276944",
            "--map-passed": getVisitTypeColor(colorMode, "passed"),
            "--map-visited": getVisitTypeColor(colorMode, "visited"),
            "--map-lived": getVisitTypeColor(colorMode, "lived"),
          }}
        >
          <WorldMap
            controlRef={mapRef}
            selected={countrySelection.mapIds}
            partiallySelected={partiallySelectedCountries}
            selectedSubdivisions={effectiveSelectedSubdivisions}
            countryVisitTypes={mapCountryVisitTypes}
            subdivisionVisitTypes={mapSubdivisionVisitTypes}
            maritimeVisitTypes={maritimeVisitTypes}
            subdivisionMode={placeGrouping === "all" ? "parents" : "off"}
            subdivisionParentIds={visibleSubdivisionParentIds}
            subdivisionsAtWorldZoom={placeGrouping === "all"}
            eezDisplayMode={eezDisplayMode}
            colorMode={colorMode}
            mapTheme={mapTheme}
            labelDensity={mapLabelDensity}
            hoverStrength={hoverOpacity / 100}
            onCountryClick={clickCountry}
            onSubdivisionClick={clickSubdivision}
            onCountryEnter={setHoveredCountryName}
            onCountryLeave={() => setHoveredCountryName("")}
            onZoom={setScale}
          />
        </div>
        <TravelProgressSidebar
          countries={statisticsSelections.countries}
          subdivisions={statisticsSelections.subdivisions}
          open={progressSidebarOpen}
          onSummaryChange={setTravelSummary}
          worldProgressMode={progressMode}
          statisticsVisitType={statisticsVisitType}
          placeGrouping={placeGrouping}
          detailedSubdivisionParentIds={visibleSubdivisionParentIds}
        />
      </main>
      <Tooltip text={hoveredCountryName} offsetX={0} offsetY={-25} />
      <Tooltip text={hoveredFlagName} offsetX={20} offsetY={-5} />
      <Toast text={toast} />
      <AboutModal open={aboutOpen} onClose={closeAbout} />
      <SettingsPanel
        open={settingsOpen}
        onClose={closeSettings}
        placeGrouping={placeGrouping}
        onPlaceGroupingChange={changePlaceGrouping}
        eezDisplayMode={eezDisplayMode}
        onEezDisplayModeChange={changeEezDisplayMode}
        progressMode={progressMode}
        onProgressModeChange={changeProgressMode}
        statisticsVisitType={statisticsVisitType}
        onStatisticsVisitTypeChange={changeStatisticsVisitType}
        colorMode={colorMode}
        onColorModeChange={changeColorMode}
        subdivisionAreaThreshold={subdivisionAreaThreshold}
        subdivisionThresholdSteps={subdivisionThresholdSteps}
        onSubdivisionAreaThresholdChange={changeSubdivisionAreaThreshold}
        mapTheme={mapTheme}
        onMapThemeChange={changeMapTheme}
        mapLabelDensity={mapLabelDensity}
        onMapLabelDensityChange={changeMapLabelDensity}
        hoverOpacity={hoverOpacity}
        onHoverOpacityChange={changeHoverOpacity}
      />

      <div
        style={{ display: shareOpen ? "flex" : "none" }}
        className="shareWrapper"
      >
        <div ref={shareWrapperRef}>
          <button
            type="button"
            className="closeShare"
            aria-label="Close share preview"
            onClick={() => {
              setShareOpen(false);
              setShareImage("");
              setShareText("");
              setShareUrl("");
            }}
          >
            <FiX aria-hidden="true" />
          </button>
          <p>{shareText}</p>
          {shareImage ? (
            <img className="shareMapImage" src={shareImage} alt="Your travel map" />
          ) : (
            <span className="shareLoading">Preparing your map…</span>
          )}
          <div className="shareLogo" aria-label="CPBR Atlas">
            <span>CPBR</span> ATLAS
          </div>
          <small className="shareAttribution">
            © MapTiler · OpenFreeMap · © OpenMapTiles · © OpenStreetMap · Marine
            Regions EEZ v12 + 24 NM Zones v4 + Territorial Seas v4 (CC BY 4.0)
          </small>
        </div>
        <div className="shareLinkRow">
          <input
            aria-label="Shareable map link"
            readOnly
            value={shareUrl}
            onFocus={(event) => event.target.select()}
          />
          <button type="button" onClick={copyShareLink}>Copy link</button>
        </div>
        <button type="button" className="downloadShare" onClick={saveImage}>
          Download image
        </button>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          font-family: "Roboto";
        }

        body {
          margin: 0;
          padding: 0;
          background-image: url(img/textured-paper.png);
          background-repeat: repeat;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        .panels {
          position: fixed;
          background: #2d2d2d;
          color: white;
          text-align: center;
          z-index: 8;
          display: flex;
          justify-content: center;
        }

        header {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-areas: "search brand balance";
          grid-template-columns: minmax(280px, 1fr) auto minmax(280px, 1fr);
          align-items: center;
          gap: 24px;
          padding: 0 18px;
          background: #2d2d2d;
          height: 96px;
        }

        .atlasBrand {
          grid-area: brand;
          display: grid;
          grid-template-columns: auto auto;
          grid-template-rows: auto auto;
          align-items: baseline;
          column-gap: 7px;
          justify-self: center;
          color: white;
          line-height: 1;
        }

        .atlasBrand > span {
          color: var(--accent-on-dark, #8fc9a7);
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .atlasBrand > strong {
          font-size: 27px;
          letter-spacing: 0.04em;
        }

        .atlasBrand > small {
          grid-column: 1 / -1;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-align: center;
          text-transform: uppercase;
        }

        .headerActions {
          grid-area: balance;
          display: flex;
          justify-self: end;
          overflow: visible;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
        }

        .headerControlButton {
          position: relative;
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          padding: 0;
          border: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 19px;
        }

        .headerControlButton:last-child {
          border-right: 0;
        }

        .headerControlButton:disabled {
          color: rgba(255, 255, 255, 0.34);
          cursor: not-allowed;
        }

        .headerControlButton:hover,
        .headerControlButton[aria-expanded="true"] {
          background: #3d3d3d;
          color: var(--accent-on-dark, #8fc9a7);
        }

        .headerControlButton::after {
          position: absolute;
          z-index: 30;
          top: calc(100% + 8px);
          right: 0;
          width: max-content;
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 3px;
          background: #2d2d2d;
          color: white;
          content: attr(data-tooltip);
          font-size: 12px;
          line-height: 1;
          opacity: 0;
          pointer-events: none;
          transform: translateY(-4px);
          transition: opacity 120ms ease, transform 120ms ease;
          white-space: nowrap;
        }

        .headerControlButton:hover::after,
        .headerControlButton:focus-visible::after {
          opacity: 1;
          transform: translateY(0);
        }

        .headerControlButton:focus-visible {
          outline: 2px solid var(--accent-on-dark, #8fc9a7);
          outline-offset: -3px;
        }

        main {
          position: relative;
          padding: 0;
          height: calc(100vh - 96px);
          overflow: hidden;
        }

        .mapWrapper {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .worldMap {
          width: 100%;
          height: 100%;
        }

        .maplibregl-canvas {
          outline: none;
        }

        .maplibregl-canvas-container.maplibregl-track-pointer,
        .maplibregl-canvas-container.maplibregl-track-pointer
          .maplibregl-canvas {
          cursor: pointer !important;
        }

        .zoom {
          left: -1px;
          bottom: -1px;
          width: 70px;
          height: 44px;
          border-radius: 0 20px 0 0;
        }

        .shareWrapper {
          position: fixed;
          top: 0px;
          left: 0px;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          flex-direction: column;
          align-items: center;
          z-index: 100;
          padding: 24px;
          background: rgba(35, 34, 31, 0.58);
          backdrop-filter: blur(6px);
        }

        .shareWrapper .downloadShare {
          margin-top: 14px;
          padding: 11px 17px;
          border: 1px solid var(--accent, #4f9a6f);
          border-radius: 999px;
          background: var(--accent, #4f9a6f);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .shareWrapper .downloadShare:hover {
          background: var(--accent-strong, #276944);
        }

        .shareLinkRow {
          display: flex;
          width: min(720px, 85vw);
          gap: 8px;
          margin-top: 14px;
        }

        .shareLinkRow input {
          min-width: 0;
          flex: 1;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: #f8f4e8;
          color: #363533;
          font: inherit;
          font-size: 12px;
        }

        .shareLinkRow button {
          flex: none;
          padding: 10px 14px;
          border: 1px solid var(--accent, #4f9a6f);
          border-radius: 8px;
          background: #2d2d2d;
          color: var(--accent-on-dark, #8fc9a7);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .shareWrapper .closeShare {
          position: absolute;
          z-index: 2;
          top: 14px;
          right: 14px;
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          padding: 0;
          border: 1px solid rgba(54, 53, 51, 0.2);
          border-radius: 50%;
          background: rgba(248, 244, 232, 0.88);
          color: #363533;
          font-size: 19px;
          cursor: pointer;
        }

        .shareWrapper .closeShare:hover {
          background: #363533;
          color: white;
        }
        .shareWrapper .shareLogo {
          position: absolute;
          bottom: 10px;
          left: 18px;
          color: #363636;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0.06em;
        }
        .shareWrapper .shareLogo span {
          color: var(--accent-strong, #276944);
        }
        .shareAttribution {
          position: absolute;
          right: 10px;
          bottom: 8px;
          padding: 2px 5px;
          border-radius: 3px;
          background: rgba(244, 239, 223, 0.86);
          color: #4a4941;
          font-size: 8px;
        }
        .shareWrapper p {
          position: absolute;
          top: 18px;
          left: 0;
          width: calc(100% - 112px);
          padding: 8px 0 14px;
          margin: 0 56px;
          border-bottom: 1px solid rgba(54, 53, 51, 0.18);
          background: transparent;
          color: #363533;
          text-align: left;
          font-size: 17px;
          font-weight: bold;
        }
        .shareWrapper > div {
          padding: 84px 18px 34px;
          background: #f8f4e8;
          border: 1px solid rgba(54, 53, 51, 0.24);
          border-radius: 18px;
          position: relative;
          box-shadow: 0 28px 80px rgba(25, 24, 22, 0.34);
          overflow: hidden;
          width: 85% !important;
          height: auto !important;
          max-width: 800px;
          min-height: 220px;
        }
        .shareWrapper .shareMapImage {
          position: static;
          display: block;
          width: 100% !important;
          height: auto !important;
        }

        .shareLoading {
          display: block;
          min-height: 260px;
          padding-top: 110px;
          color: #363636;
          text-align: center;
        }

        .removeCountries {
          top: 116px;
          bottom: 70px;
          width: 40px;
          border-radius: 0 20px 20px 0;
          display: flex;
          flex-direction: column;
          transition: left 200ms ease;
        }

        .removeCountries div {
          overflow: scroll;
          scrollbar-width: none;
          -ms-overflow-style: none;
          flex: 1;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .removeCountries div::-webkit-scrollbar {
          display: none;
        }

        .selectedPlaceFlag {
          display: grid;
          width: 38px;
          min-height: 30px;
          place-items: center;
          margin: 2px 0;
          padding: 3px 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .selectedPlaceFlag:hover,
        .selectedPlaceFlag:focus-visible {
          background: rgba(255, 255, 255, 0.12);
          outline: none;
        }

        .selectedPlaceFlag.visitType-passed {
          --selected-visit-color: var(--visit-passed);
        }

        .selectedPlaceFlag.visitType-visited {
          --selected-visit-color: var(--visit-visited);
        }

        .selectedPlaceFlag.visitType-lived {
          --selected-visit-color: var(--visit-lived);
        }

        .selectedPlaceFlag[class*="visitType-"] {
          background-color: color-mix(
            in srgb,
            var(--selected-visit-color) 22%,
            transparent
          );
          box-shadow: inset 3px 0 var(--selected-visit-color);
        }

        .selectedPlaceFlag[class*="visitType-"]:hover,
        .selectedPlaceFlag[class*="visitType-"]:focus-visible {
          background-color: color-mix(
            in srgb,
            var(--selected-visit-color) 38%,
            transparent
          );
        }

        .selectedPlaceFlag.visitType-passed {
          background-image: repeating-linear-gradient(
            135deg,
            color-mix(in srgb, var(--selected-visit-color) 44%, transparent)
              0 2px,
            transparent 2px 7px
          );
        }

        .selectedPlaceFlag.visitType-lived {
          background-image: radial-gradient(
            circle at 2px 2px,
            color-mix(in srgb, var(--selected-visit-color) 58%, transparent)
              0 1.25px,
            transparent 1.5px
          );
          background-size: 7px 7px;
        }

        .rightActions {
          right: -1px;
          bottom: -1px;
          border-radius: 20px 0 0 0;
        }

        .mapControlButton {
          position: relative;
          display: grid;
          height: 44px;
          place-items: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 20px;
        }

        .mapControlButton::before {
          position: absolute;
          z-index: 20;
          bottom: calc(100% + 8px);
          left: 50%;
          width: max-content;
          max-width: 160px;
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 3px;
          background: #2d2d2d;
          color: white;
          content: attr(data-tooltip);
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, 4px);
          transition: opacity 120ms ease, transform 120ms ease;
          white-space: nowrap;
        }

        .mapControlButton:hover::before,
        .mapControlButton:focus-visible::before {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        .mapControlButton:focus-visible {
          z-index: 1;
          outline: 2px solid var(--accent-on-dark, #8fc9a7);
          outline-offset: -3px;
        }

        .mapActionButton {
          width: 45px;
        }

        .infoButton {
          border-right: 1px solid rgba(255, 255, 255, 0.12);
        }

        .infoButton {
          border-radius: 20px 0 0 0;
        }

        .mapActionButton:hover,
        .zoomButton:hover,
        .clear:hover {
          background: #3d3d3d;
        }

        .zoomButton {
          width: 35px;
        }

        .zoomButton:last-child {
          border-radius: 0 20px 0 0;
        }

        .zoomButton[aria-disabled="true"] {
          color: #777;
          cursor: default;
        }

        .zoomButton:first-child::before {
          right: auto;
          left: 4px;
          transform: translateY(4px);
        }

        .zoomButton:first-child:hover::before,
        .zoomButton:first-child:focus-visible::before,
        .shareButton:hover::before,
        .shareButton:focus-visible::before {
          transform: translateY(0);
        }

        .shareButton::before {
          right: 4px;
          left: auto;
          transform: translateY(4px);
        }

        .clear {
          position: fixed;
          right: calc(50% - 23px);
          bottom: -48px;
          width: 45px;
          background: #2d2d2d;
          opacity: 0;
          cursor: pointer;
          border-radius: 20px 20px 0 0;
          pointer-events: none;
          transform: translateY(8px);
          transition: bottom 220ms ease, opacity 180ms ease,
            transform 220ms ease, background-color 120ms ease;
        }

        .clear.isVisible {
          bottom: -1px;
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }

        .plusContainer {
          width: 40px;
          justify-content: center;
          align-items: center;
          display: flex;
          margin-left: 10px;
          margin-top: 3px;
        }
        .plusContainer svg {
          font-size: 22px;
          color: gray;
        }

        .addCountry {
          grid-area: search;
          width: min(480px, 100%);
          display: flex;
          gap: 6px;
          justify-content: flex-start;
          align-items: center;
          height: 50px;
          color: white;
        }

        @media only screen and (max-width: 768px) {
          header {
            grid-template-areas:
              "brand"
              "search";
            grid-template-columns: 1fr;
            grid-template-rows: 64px 40px;
            gap: 0;
            height: 104px;
            padding: 0 10px;
          }

          .atlasBrand > span {
            font-size: 17px;
          }

          .atlasBrand > strong {
            font-size: 23px;
          }

          .headerActions {
            position: absolute;
            top: 10px;
            right: 8px;
          }

          .headerControlButton {
            width: 38px;
            height: 38px;
          }

          main {
            height: calc(100vh - 104px);
          }

          .plusContainer {
            display: none;
          }

          .addCountry {
            width: 100%;
            justify-content: center;
            height: 40px;
          }

          .removeCountries {
            top: 124px;
            bottom: 70px;
          }
        }
        @media (pointer: coarse) {
          .clear {
            right: -1px;
            width: 45px;
            cursor: pointer;
            border-radius: 20px 0 0 0;
          }

          .clear.isVisible {
            bottom: -1px;
          }
          .rightActions {
            right: 44px;
          }
          .shareButton {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
