import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiInfo, FiX } from "react-icons/fi";
import PlaceFlag from "./PlaceFlag";
import { groupDefinitions, groupSections } from "../utils/categoryData";
import { getCountryById, worldLand } from "../utils/mapData";
import {
  getSubdivisionById,
  getSubdivisionsForParent,
  subdivisionGroupDefinitions,
  subdivisionGroupSections,
} from "../utils/subdivisionData";
import {
  associatedStateFor,
  expandGroupedSelection,
} from "../utils/territoryData";

const allGroupDefinitions = [
  ...groupDefinitions,
  ...subdivisionGroupDefinitions,
];
const allGroupSections = [...groupSections, ...subdivisionGroupSections];

const ukConstituentCountryIds = ["eng", "nir", "sco", "wal"];
const statisticsCopyByVisitType = {
  passed: {
    scope: "Passed through+",
    section: "Reached",
    complete: "Reached",
    partial: "reached",
    missing: "Not reached",
  },
  visited: {
    scope: "Visited+",
    section: "Visited",
    complete: "Visited",
    partial: "visited",
    missing: "Not visited",
  },
  lived: {
    scope: "Lived only",
    section: "Lived",
    complete: "Lived",
    partial: "lived",
    missing: "Not lived in",
  },
};
const countryLeavesCache = new Map();
const uniqueLeavesCache = new Map();

function leavesForCountry(countryId) {
  if (countryLeavesCache.has(countryId)) {
    return countryLeavesCache.get(countryId);
  }

  const divisions = getSubdivisionsForParent(countryId);
  let leaves;
  if (divisions.length) {
    leaves = divisions.map((division) => ({
      id: division.id,
      type: "subdivision",
      parentId: countryId,
      topLevelId: countryId,
      land: (getCountryById(countryId)?.land || 0) * division.landShare,
    }));
  } else if (countryId === "gb") {
    leaves = ukConstituentCountryIds.map((id) => ({
      id,
      type: "country",
      topLevelId: countryId,
      land: getCountryById(id)?.land || 0,
    }));
  } else {
    leaves = [{
      id: countryId,
      type: "country",
      topLevelId: countryId,
      land: getCountryById(countryId)?.land || 0,
    }];
  }

  countryLeavesCache.set(countryId, leaves);
  return leaves;
}

function uniqueLeaves(countryIds) {
  const cacheKey = countryIds.join("|");
  if (uniqueLeavesCache.has(cacheKey)) {
    return uniqueLeavesCache.get(cacheKey);
  }
  const leaves = countryIds.flatMap(leavesForCountry);
  const unique = [
    ...new Map(
      leaves.map((leaf) => [`${leaf.type}:${leaf.id}`, leaf]),
    ).values(),
  ];
  uniqueLeavesCache.set(cacheKey, unique);
  return unique;
}

function leafVisited(leaf, selectedCountries, selectedSubdivisions) {
  if (selectedCountries.has(leaf.topLevelId)) return true;
  return leaf.type === "subdivision"
    ? selectedSubdivisions.has(leaf.id)
    : selectedCountries.has(leaf.id);
}

function completionForLeaves(
  selectedCountries,
  selectedSubdivisions,
  leaves,
  weighting = "places",
) {
  if (!leaves.length) return 0;
  const weightFor = (leaf) => weighting === "land" ? leaf.land : 1;
  const totalWeight = leaves.reduce((total, leaf) => total + weightFor(leaf), 0);
  if (totalWeight <= 0) return 0;
  const visitedWeight = leaves.reduce(
    (total, leaf) =>
      total +
      (leafVisited(leaf, selectedCountries, selectedSubdivisions)
        ? weightFor(leaf)
        : 0),
    0,
  );
  return Math.min(1, visitedWeight / totalWeight);
}

function groupedMemberUnits(
  countryIds,
  placeGrouping,
  expandAllPlaces = false,
  detailedSubdivisionParents = new Set(),
) {
  if (placeGrouping === "all" && expandAllPlaces) {
    return countryIds.flatMap((countryId) => {
      const leaves = leavesForCountry(countryId);
      return detailedSubdivisionParents.has(countryId)
        ? leaves.map((leaf) => ({ leaves: [leaf] }))
        : [{ id: countryId, leaves }];
    });
  }
  if (placeGrouping !== "sovereign") {
    return countryIds.map((countryId) => ({
      id: countryId,
      leaves: leavesForCountry(countryId),
    }));
  }

  const membersByState = countryIds.reduce((groups, countryId) => {
    const stateId = associatedStateFor(countryId);
    groups.set(stateId, [...(groups.get(stateId) || []), countryId]);
    return groups;
  }, new Map());
  return [...membersByState].map(([id, memberIds]) => ({
    id,
    leaves: uniqueLeaves(memberIds),
  }));
}

function percentageOfGroup(
  selectedCountries,
  selectedSubdivisions,
  group,
  worldProgressMode,
  placeGrouping,
  detailedSubdivisionParents,
) {
  if (group.memberType === "subdivision") {
    const leaves = group.subdivisions
      .map((subdivisionId) => {
        const subdivision = getSubdivisionById(subdivisionId);
        return subdivision
          ? {
              id: subdivision.id,
              type: "subdivision",
              topLevelId: subdivision.parentId,
              land: subdivision.landShare,
            }
          : null;
      })
      .filter(Boolean);
    const completion = completionForLeaves(
      selectedCountries,
      selectedSubdivisions,
      leaves,
    );
    return completion === 1 ? 100 : Math.min(99.9, completion * 100);
  }
  if (group.id === "land" && worldProgressMode === "land") {
    const worldLeaves = uniqueLeaves(group.countries);
    const visitedLand = worldLeaves.reduce(
      (total, leaf) =>
        total +
        (leafVisited(leaf, selectedCountries, selectedSubdivisions)
          ? leaf.land
          : 0),
      0,
    );
    const allPlacesVisited = worldLeaves.every((leaf) =>
      leafVisited(leaf, selectedCountries, selectedSubdivisions),
    );
    const rawPercentage = (visitedLand / worldLand) * 100;
    return allPlacesVisited
      ? 100
      : Math.min(99.9, rawPercentage);
  }

  const units = groupedMemberUnits(
    group.countries,
    placeGrouping,
    group.id === "land",
    detailedSubdivisionParents,
  );
  const completedPlaces = units.reduce(
    (total, unit) => total + completionForLeaves(
      selectedCountries,
      selectedSubdivisions,
      unit.leaves,
    ),
    0,
  );
  if (completedPlaces === units.length) return 100;
  return Math.min(99.9, (completedPlaces / units.length) * 100);
}

function displayPercentage(percentage) {
  if (percentage === 100) return "100";
  if (percentage <= 0) return "0.0";
  if (percentage < 0.05) return "<0.1";
  return percentage.toFixed(1);
}

const TravelProgressSidebar = ({
  countries,
  subdivisions = [],
  open,
  onSummaryChange,
  worldProgressMode = "land",
  statisticsVisitType = "visited",
  placeGrouping = "standard",
  detailedSubdivisionParentIds = [],
}) => {
  const [currentDisplay, setCurrentDisplay] = useState("land");
  const [infoGroupId, setInfoGroupId] = useState(null);
  const statisticsCopy = statisticsCopyByVisitType[statisticsVisitType] ||
    statisticsCopyByVisitType.visited;
  const selectedCountries = useMemo(
    () => new Set(
      placeGrouping === "sovereign"
        ? expandGroupedSelection(countries)
        : countries,
    ),
    [countries, placeGrouping],
  );
  const selectedSubdivisions = useMemo(
    () => new Set(subdivisions),
    [subdivisions],
  );
  const detailedSubdivisionParents = useMemo(
    () => new Set(detailedSubdivisionParentIds),
    [detailedSubdivisionParentIds],
  );
  const currentGroup = allGroupDefinitions.find(
    (group) => group.id === currentDisplay,
  );
  const infoGroup = allGroupDefinitions.find((group) => group.id === infoGroupId);

  const progressByGroup = useMemo(() => {
    const visibleGroups = open
      ? allGroupDefinitions
      : [currentGroup, infoGroup].filter(
          (group, index, groups) =>
            group && groups.findIndex(({ id }) => id === group.id) === index,
        );
    return Object.fromEntries(
      visibleGroups.map((group) => [
        group.id,
        percentageOfGroup(
          selectedCountries,
          selectedSubdivisions,
          group,
          worldProgressMode,
          placeGrouping,
          detailedSubdivisionParents,
        ),
      ]),
    );
  }, [
    placeGrouping,
    detailedSubdivisionParents,
    currentGroup,
    infoGroup,
    open,
    selectedCountries,
    selectedSubdivisions,
    worldProgressMode,
  ]);

  const currentPercentage = progressByGroup[currentDisplay] || 0;
  const infoCountries = (infoGroup?.memberType === "subdivision"
    ? (infoGroup.subdivisions || []).map((subdivisionId) => {
        const subdivision = getSubdivisionById(subdivisionId);
        return subdivision
          ? {
              ...subdivision,
              leaves: [{
                id: subdivision.id,
                type: "subdivision",
                topLevelId: subdivision.parentId,
                land: subdivision.landShare,
              }],
            }
          : null;
      })
    : groupedMemberUnits(
        infoGroup?.countries || [],
        placeGrouping,
        infoGroup?.id === "land",
        detailedSubdivisionParents,
      ).map((unit) => {
        const singleLeaf = unit.leaves.length === 1 ? unit.leaves[0] : null;
        const place = singleLeaf?.type === "subdivision"
          ? getSubdivisionById(singleLeaf.id)
          : getCountryById(unit.id || singleLeaf?.id);
        if (!place) return null;
        return {
          ...place,
          id: unit.id || singleLeaf.id,
          name:
            infoGroup?.memberNames?.[unit.id || singleLeaf.id] || place.name,
          leaves: unit.leaves,
        };
      }))
    .filter(Boolean)
    .map((country) => ({
      ...country,
      completion: completionForLeaves(
        selectedCountries,
        selectedSubdivisions,
        country.leaves,
        infoGroup?.id === "land" && worldProgressMode === "land"
          ? "land"
          : "places",
      ),
    }))
    .sort((countryA, countryB) => countryA.name.localeCompare(countryB.name));
  const infoVisitedCountries = infoCountries.filter(
    (country) => country.completion > 0,
  );
  const infoMissingCountries = infoCountries.filter(
    (country) => country.completion === 0,
  );
  const infoCompletion = infoGroup ? progressByGroup[infoGroup.id] : 0;

  useEffect(() => {
    onSummaryChange?.({
      label: currentGroup.label,
      percentage: displayPercentage(currentPercentage),
    });
  }, [currentGroup.label, currentPercentage, onSummaryChange]);

  useEffect(() => {
    if (!infoGroupId) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setInfoGroupId(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [infoGroupId]);

  return (
    <aside
      id="travel-progress-sidebar"
      className={`progressSidebar ${open ? "open" : "closed"}`}
      aria-label="Travel progress"
      aria-hidden={!open}
    >
      {open && (
        <div className="progressSidebarPanel">
          <div className="progressSidebarHeader">
            <p>Travel progress · {statisticsCopy.scope}</p>
            <div>
              <strong>{displayPercentage(currentPercentage)}%</strong>
              <span>of {currentGroup.label}</span>
            </div>
          </div>

          <div className="groupMenu" aria-label="Travel groupings">
            {allGroupSections.map((section) => (
              <section className="groupSection" key={section.label}>
                <h2 className="groupSectionLabel">{section.label}</h2>
                {section.groups.map((group) => {
                  const percentage = progressByGroup[group.id];
                  const complete = percentage === 100;
                  const selected = group.id === currentDisplay;

                  return (
                    <div className="groupOptionRow" key={group.id}>
                      <span
                        className={`groupProgress ${complete ? "complete" : ""}`}
                        style={{ width: `${percentage}%` }}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        className="groupOption"
                        aria-pressed={selected}
                        onClick={() => setCurrentDisplay(group.id)}
                      >
                        <span className="groupOptionLabel">
                          {selected && <FiCheck aria-hidden="true" />}
                          <span>{group.label}</span>
                        </span>
                        <strong>{displayPercentage(percentage)}%</strong>
                      </button>
                      {group.description && (
                        <button
                          type="button"
                          className="groupInfoButton"
                          aria-label={`About ${group.label}`}
                          onClick={() => setInfoGroupId(group.id)}
                        >
                          <FiInfo aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      )}

      {infoGroup &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          className="groupInfoBackdrop"
          onClick={() => setInfoGroupId(null)}
          role="presentation"
        >
          <section
            className="groupInfoDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-info-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="groupInfoHeader">
              <div>
                <p>{infoCountries.length} places in this list</p>
                <h2 id="group-info-title">{infoGroup.label}</h2>
              </div>
              <button
                type="button"
                className="groupInfoClose"
                aria-label="Close category information"
                onClick={() => setInfoGroupId(null)}
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <div className="groupInfoBody">
              <div className="groupInfoIntro">
                <p className="groupInfoDescription">{infoGroup.description}</p>
                <div className="groupInfoSources">
                  {infoGroup.sources?.map((source) => (
                    <a
                      className="groupInfoSource"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      key={source.id}
                    >
                      {source.label} · {source.dateLabel}
                    </a>
                  ))}
                </div>
              </div>

              <div className="groupInfoProgressSummary">
                <div>
                  <strong>
                    {infoVisitedCountries.length} of {infoCountries.length} {statisticsCopy.partial}
                  </strong>
                  <span>{displayPercentage(infoCompletion)}% complete</span>
                </div>
                <div
                  className="groupInfoProgressTrack"
                  role="progressbar"
                  aria-label={`${infoGroup.label} completion`}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={Number(infoCompletion.toFixed(1))}
                >
                  <span style={{ width: `${infoCompletion}%` }} />
                </div>
              </div>

              <div className="groupCountrySections">
                {infoVisitedCountries.length > 0 && (
                  <section className="groupCountrySection">
                    <h3>
                      {statisticsCopy.section} <span>{infoVisitedCountries.length}</span>
                    </h3>
                    <div className="groupCountryList">
                      {infoVisitedCountries.map((country) => (
                        <div className="groupCountry visited" key={country.id}>
                          <PlaceFlag
                            placeId={country.id}
                            className="groupCountryFlag"
                            width={24}
                          />
                          <span className="groupCountryName">{country.name}</span>
                          <span className="groupCountryStatus">
                            {country.completion === 1 ? (
                              <><FiCheck aria-hidden="true" /> {statisticsCopy.complete}</>
                            ) : (
                              `${displayPercentage(country.completion * 100)}% ${statisticsCopy.partial}`
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {infoMissingCountries.length > 0 && (
                  <section className="groupCountrySection missingSection">
                    <h3>
                      {statisticsCopy.missing} <span>{infoMissingCountries.length}</span>
                    </h3>
                    <div className="groupCountryList">
                      {infoMissingCountries.map((country) => (
                        <div className="groupCountry missing" key={country.id}>
                          <PlaceFlag
                            placeId={country.id}
                            className="groupCountryFlag"
                            width={24}
                          />
                          <span className="groupCountryName">{country.name}</span>
                          <span className="groupCountryStatus">{statisticsCopy.missing}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )}

      <style jsx>{`
        .progressSidebar {
          position: fixed;
          z-index: 9;
          right: 0;
          overflow: hidden;
          border: 1px solid #4a4a4a;
          border-right: 0;
          border-radius: 8px 0 0 8px;
          background: #2d2d2d;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
          color: white;
          transition: opacity 160ms ease, transform 200ms ease;
        }

        .progressSidebar.closed {
          top: 96px;
          bottom: 56px;
          width: min(360px, calc(100vw - 16px));
          opacity: 0;
          pointer-events: none;
          transform: translateX(100%);
        }

        .progressSidebar.open {
          top: 96px;
          bottom: 56px;
          width: min(360px, calc(100vw - 16px));
          opacity: 1;
          transform: translateX(0);
        }

        .progressSidebarPanel {
          display: flex;
          height: 100%;
          flex-direction: column;
        }

        .progressSidebarHeader {
          flex: none;
          padding: 13px 18px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          background: #292929;
        }

        .progressSidebarHeader p {
          margin: 0 0 5px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .progressSidebarHeader div {
          display: flex;
          align-items: baseline;
          gap: 7px;
        }

        .progressSidebarHeader strong {
          color: var(--accent-on-dark, #8fc9a7);
          font-size: 27px;
          line-height: 1;
        }

        .progressSidebarHeader span {
          overflow: hidden;
          color: white;
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .groupOption:focus-visible,
        .groupInfoButton:focus-visible,
        .groupInfoClose:focus-visible,
        .groupInfoSource:focus-visible {
          outline: 2px solid var(--accent-on-dark, #8fc9a7);
          outline-offset: 2px;
        }

        .groupMenu {
          min-height: 0;
          flex: 1;
          overflow-x: hidden;
          overflow-y: auto;
          background: #2d2d2d;
          overscroll-behavior: contain;
        }

        .groupSectionLabel {
          position: sticky;
          z-index: 3;
          top: 0;
          padding: 8px 12px 6px;
          background: #242424;
          color: rgba(255, 255, 255, 0.62);
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .groupOptionRow {
          position: relative;
          isolation: isolate;
          display: flex;
          width: 100%;
          min-height: 44px;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .groupSection:last-child .groupOptionRow:last-child {
          border-bottom: 0;
        }

        .groupOption {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          min-height: 44px;
          flex: 1;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 8px 0 12px;
          border: 0;
          background: transparent;
          color: white;
          cursor: pointer;
          text-align: left;
        }

        .groupOption:hover,
        .groupInfoButton:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .groupInfoButton {
          position: relative;
          z-index: 1;
          display: grid;
          width: 40px;
          min-height: 44px;
          flex: none;
          place-items: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
        }

        .groupInfoButton:hover {
          color: var(--accent-on-dark, #8fc9a7);
        }

        .groupProgress {
          position: absolute;
          z-index: 0;
          inset: 0 auto 0 0;
          background: rgba(55, 142, 210, 0.42);
          transition: width 200ms ease;
        }

        .groupProgress.complete {
          background: rgba(70, 233, 146, 0.42);
        }

        .groupOptionLabel {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 7px;
        }

        .groupOptionLabel :global(svg) {
          flex: none;
          color: var(--accent-on-dark, #8fc9a7);
        }

        .groupOption > strong {
          flex: none;
          font-size: 13px;
          font-weight: 500;
        }

        .groupInfoBackdrop {
          position: fixed;
          z-index: 100;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(35, 34, 31, 0.54);
          backdrop-filter: blur(6px);
          white-space: normal;
        }

        .groupInfoDialog {
          display: flex;
          width: min(650px, 100%);
          max-height: min(760px, calc(100vh - 48px));
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(54, 53, 51, 0.23);
          border-radius: 18px;
          background: #f8f4e8;
          box-shadow: 0 28px 80px rgba(25, 24, 22, 0.34);
          color: #363533;
        }

        .groupInfoHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 21px 22px 17px;
          border-bottom: 1px solid rgba(54, 53, 51, 0.15);
          background: rgba(248, 244, 232, 0.96);
        }

        .groupInfoHeader p {
          color: var(--accent-strong, #276944);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .groupInfoHeader h2 {
          margin: 3px 0 0;
          color: #363533;
          font-size: 25px;
          line-height: 1.15;
        }

        .groupInfoClose {
          display: grid;
          width: 38px;
          height: 38px;
          flex: none;
          place-items: center;
          padding: 0;
          border: 1px solid rgba(54, 53, 51, 0.35);
          border-radius: 50%;
          background: transparent;
          color: #494741;
          cursor: pointer;
        }

        .groupInfoClose:hover {
          border-color: var(--accent, #4f9a6f);
          background: var(--accent, #4f9a6f);
          color: white;
        }

        .groupInfoBody {
          min-height: 0;
          overflow-y: auto;
        }

        .groupInfoIntro {
          padding: 18px 22px 16px;
        }

        .groupInfoDescription {
          margin: 0;
          color: #565249;
          font-size: 13px !important;
          line-height: 1.5;
        }

        .groupInfoSources {
          display: flex;
          flex-wrap: wrap;
          gap: 5px 12px;
          margin-top: 8px;
        }

        .groupInfoSource {
          color: var(--accent-strong, #276944);
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
        }

        .groupInfoSource:hover {
          text-decoration: underline;
        }

        .groupInfoProgressSummary {
          padding: 14px 22px 16px;
          border-top: 1px solid rgba(54, 53, 51, 0.17);
          border-bottom: 1px solid rgba(54, 53, 51, 0.17);
          background: rgba(63, 134, 96, 0.055);
        }

        .groupInfoProgressSummary > div:first-child {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .groupInfoProgressSummary strong {
          color: #363533;
          font-size: 13px;
        }

        .groupInfoProgressSummary > div:first-child span {
          color: #6f6a61;
          font-size: 11px;
        }

        .groupInfoProgressTrack {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(54, 53, 51, 0.15);
        }

        .groupInfoProgressTrack span {
          display: block;
          height: 100%;
          background: var(--accent, #4f9a6f);
          border-radius: inherit;
          transition: width 200ms ease;
        }

        .groupCountrySections {
          padding: 18px 22px 22px;
        }

        .groupCountrySection + .groupCountrySection {
          margin-top: 20px;
        }

        .groupCountrySection h3 {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 6px;
          color: var(--accent-strong, #276944);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .groupCountrySection h3 span {
          color: #827d73;
          font-size: 10px;
          font-weight: 500;
        }

        .missingSection h3 {
          color: #615e57;
        }

        .groupCountryList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 18px;
          border-top: 1px solid rgba(54, 53, 51, 0.16);
        }

        .groupCountry {
          display: grid;
          min-width: 0;
          min-height: 40px;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 9px 5px;
          border-bottom: 1px solid rgba(54, 53, 51, 0.12);
          font-size: 12px;
        }

        .groupCountry.visited {
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--accent, #4f9a6f) 10%, transparent),
            color-mix(in srgb, var(--accent, #4f9a6f) 2%, transparent)
          );
        }

        .subdivisionCodeBadge {
          display: grid;
          width: 26px;
          height: 20px;
          place-items: center;
          border: 1px solid rgba(54, 53, 51, 0.3);
          color: var(--accent-strong, #276944);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .groupCountryName {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .groupCountryStatus {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #817c72;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .visited .groupCountryStatus {
          color: var(--accent-strong, #276944);
        }

        .groupCountryStatus :global(svg) {
          font-size: 12px;
          stroke-width: 3;
        }

        @media only screen and (max-width: 768px) {
          .progressSidebar.closed,
          .progressSidebar.open {
            top: 104px;
            bottom: 52px;
            width: min(350px, calc(100vw - 12px));
          }

          .groupInfoBackdrop {
            padding: 12px;
          }

          .groupInfoDialog {
            max-height: calc(100vh - 24px);
          }

          .groupInfoHeader {
            padding: 16px 16px 12px;
          }

          .groupInfoIntro {
            padding: 13px 16px;
          }

          .groupInfoProgressSummary {
            padding: 12px 16px 14px;
          }

          .groupCountrySections {
            padding: 15px 16px 18px;
          }

          .groupCountryList {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </aside>
  );
};

export default TravelProgressSidebar;
