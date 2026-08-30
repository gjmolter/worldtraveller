import { useEffect, useRef, useState } from "react";

import { getCountryById, worldJSON } from "../utils/mapData";
import { subdivisions } from "../utils/subdivisionData";
import { displayStateFor } from "../utils/territoryData";
import { visitTypeLabel } from "../utils/visitTypes.mjs";
import PlaceFlag from "./PlaceFlag";

const ComboBox = ({
  selectedPlace,
  selectedList = [],
  selectedSubdivisions = [],
  placeGrouping = "standard",
  includeSubdivisions = false,
  subdivisionParentIds = [],
  visitTypeByPlaceId = {},
  disabled = false,
}) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(worldJSON);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const optionRefs = useRef(new Map());
  const closeTimeoutRef = useRef(null);
  const subdivisionParentFilter = new Set(subdivisionParentIds);

  useEffect(() => {
    const query = term.trim().toLowerCase();
    const countries = worldJSON
      .filter(
        (country) =>
          country.selectable !== false &&
          (placeGrouping !== "sovereign" ||
            displayStateFor(country.id.toLowerCase(), placeGrouping) ===
              country.id.toLowerCase()) &&
          [country.name, ...(country.aliases || [])].some((name) =>
            name.toLocaleLowerCase().includes(query),
          ) &&
          (!selectedList.includes(country.id.toLowerCase()) || query.length > 0),
      )
      .map((country) => ({
        ...country,
        type: "country",
        selectedVisitType: visitTypeByPlaceId[country.id.toLowerCase()],
      }));
    const childPlaces = includeSubdivisions
      ? subdivisions
          .filter(
            (subdivision) =>
              subdivisionParentFilter.has(subdivision.parentId) &&
              subdivision.name.toLowerCase().includes(query) &&
              (!selectedSubdivisions.includes(subdivision.id) ||
                query.length > 0),
          )
          .map((subdivision) => ({
            ...subdivision,
            type: "subdivision",
            selectedVisitType: visitTypeByPlaceId[subdivision.id],
          }))
      : [];
    setResults([...countries, ...childPlaces]);
    setActiveIndex(-1);
  }, [
    includeSubdivisions,
    placeGrouping,
    selectedList,
    selectedSubdivisions,
    subdivisionParentIds,
    term,
    visitTypeByPlaceId,
  ]);

  useEffect(() => {
    if (!disabled) return;
    setTerm("");
    setOpen(false);
    setActiveIndex(-1);
  }, [disabled]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current.get(results[activeIndex]?.id)?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open, results]);

  function selectResult(place) {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    selectedPlace(place);
    setTerm("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        results.length ? (current + 1) % results.length : -1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        results.length
          ? current <= 0
            ? results.length - 1
            : current - 1
          : -1,
      );
      return;
    }

    if (event.key === "Home" && open && results.length) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End" && open && results.length) {
      event.preventDefault();
      setActiveIndex(results.length - 1);
      return;
    }

    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="comboInputWrapper">
      <input
        id="country-search"
        role="combobox"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
          setOpen(true);
        }}
        onBlur={() => {
          if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
          }
          closeTimeoutRef.current = window.setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
            closeTimeoutRef.current = null;
          }, 100);
        }}
        onKeyDown={handleKeyDown}
        className="addCountryInput"
        placeholder="Add Place..."
        disabled={disabled}
        aria-label="Add place"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="country-results"
        aria-activedescendant={
          activeIndex >= 0
            ? `country-option-${results[activeIndex]?.id}`
            : undefined
        }
      />
      {open && results && (
        <div
          className="comboPopOver"
          id="country-results"
          role="listbox"
          aria-labelledby="country-search"
        >
          {results.length > 0 ? (
            <div>
              {results.map((place, index) => (
                <button
                  type="button"
                  id={`country-option-${place.id}`}
                  key={place.id}
                  ref={(element) => {
                    if (element) optionRefs.current.set(place.id, element);
                    else optionRefs.current.delete(place.id);
                  }}
                  className="comboOption"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectResult(place)}
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                >
                  <PlaceFlag placeId={place.id} width={28} />
                  <span className="comboOptionText">
                    <strong>{place.name}</strong>
                    {place.selectedVisitType ? (
                      <small>Currently {visitTypeLabel(place.selectedVisitType)}</small>
                    ) : place.type === "subdivision" && (
                      <small>{getCountryById(place.parentId)?.name}</small>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <span style={{ display: "block", margin: 8 }}>
              No results found
            </span>
          )}
        </div>
      )}
      <style jsx global>{`
        .comboInputWrapper {
          position: relative;
          width: 220px;
          flex: 0 0 220px;
        }

        .addCountryInput {
          display: block;
          width: 100%;
          margin: 0;
          border: none;
          background: none;
          color: white;
          font-size: 18px;
          padding: 10px 8px;
        }

        .addCountryInput:focus {
          outline: none;
        }

        .comboOptionText {
          display: flex;
          min-width: 0;
          flex-direction: column;
          text-align: left;
        }

        .comboOptionText strong {
          overflow: hidden;
          font-weight: 500;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .comboOptionText small {
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          line-height: 1.2;
        }

        .comboPopOver {
          position: absolute;
          z-index: 20;
          top: calc(100% + 10px);
          left: 0;
          width: 260px;
          margin: 0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0 0 7px 7px;
          background: #2d2d2d;
          color: white;
          max-height: min(320px, calc(100vh - 120px));
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .comboPopOver::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }

        .comboOption {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 0;
          background: transparent;
          color: white;
          text-align: left;
          cursor: pointer;
        }

        .comboOption:hover,
        .comboOption[aria-selected="true"],
        .comboOption:focus-visible {
          background: var(--accent-soft, #8fc9a7);
          color: #2d2d2d;
          font-weight: bold;
        }

        .comboBox:focus {
          outline: none;
        }
        @media only screen and (max-width: 768px) {
          .comboInputWrapper {
            width: auto;
            min-width: 0;
            flex: 1 1 auto;
          }

          .addCountryInput {
            width: 100%;
            font-size: 14px;
            text-align: left;
          }

          .comboPopOver {
            top: calc(100% + 4px);
            width: 100%;
            max-height: min(280px, calc(100vh - 152px));
          }
        }
      `}</style>
    </div>
  );
};

export default ComboBox;
