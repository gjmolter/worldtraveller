import { useEffect, useRef, useState } from "react";

import { worldJSON } from "../utils/mapData";

const ComboBox = ({ selectedCountry, selectedList = [] }) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(worldJSON);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const optionRefs = useRef(new Map());

  useEffect(() => {
    var tempCountries = worldJSON.filter((country) => {
      return (
        country.name.toLowerCase().includes(term.trim().toLowerCase()) &&
        !selectedList.includes(country.id.toLowerCase())
      );
    });
    setResults(tempCountries);
    setActiveIndex(-1);
  }, [term, selectedList]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current.get(results[activeIndex]?.id)?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open, results]);

  function selectCountry(country) {
    selectedCountry(country.name);
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
      selectCountry(results[activeIndex]);
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
        onFocus={() => setOpen(true)}
        onBlur={() =>
          window.setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
          }, 100)
        }
        onKeyDown={handleKeyDown}
        className="addCountryInput"
        placeholder="Add Country..."
        aria-label="Add country"
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
              {results.map((country, index) => (
                <button
                  type="button"
                  id={`country-option-${country.id}`}
                  key={country.id}
                  ref={(element) => {
                    if (element) optionRefs.current.set(country.id, element);
                    else optionRefs.current.delete(country.id);
                  }}
                  className="comboOption"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectCountry(country)}
                  role="option"
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                >
                  <span style={{ marginRight: "8px" }}>{country.flag}</span>
                  {country.name}
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
          display: block;
          width: 100%;
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
          background: #46e992;
          color: #2d2d2d;
          font-weight: bold;
        }

        .comboBox:focus {
          outline: none;
        }
        @media only screen and (max-width: 768px) {
          .comboInputWrapper {
            width: 90%;
            flex-basis: auto;
          }

          .addCountryInput {
            width: 100%;
            font-size: 14px;
            text-align: center;
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
