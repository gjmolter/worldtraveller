import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import {
  europeanUnion,
  getCountryById,
  monarchies,
  sevenWondersNew,
  sevenWondersOld,
  worldLand,
} from "../utils/mapData";

const groupDefinitions = [
  { id: "land", label: "World Land" },
  { id: "eu", label: "European Union", countries: europeanUnion },
  {
    id: "7old",
    label: "Ancient 7 Wonders",
    countries: sevenWondersOld,
  },
  { id: "7new", label: "New 7 Wonders", countries: sevenWondersNew },
  { id: "monarchies", label: "World Monarchies", countries: monarchies },
];

function percentageOfGroup(selectedCountries, group) {
  if (group.id === "land") {
    const visitedLand = [...selectedCountries].reduce(
      (total, countryId) => total + (getCountryById(countryId)?.land || 0),
      0,
    );
    return Math.min(100, (visitedLand / worldLand) * 100);
  }

  const visited = group.countries.filter((countryId) =>
    selectedCountries.has(countryId),
  ).length;
  return Math.min(100, (visited / group.countries.length) * 100);
}

function displayPercentage(percentage) {
  return percentage > 0 ? percentage.toFixed(1) : "0";
}

const YouveTravelled = ({ countries, onSummaryChange }) => {
  const [currentDisplay, setCurrentDisplay] = useState("land");
  const [open, setOpen] = useState(false);
  const selectorRef = useRef(null);

  const progressByGroup = useMemo(() => {
    const selectedCountries = new Set(countries);
    return Object.fromEntries(
      groupDefinitions.map((group) => [
        group.id,
        percentageOfGroup(selectedCountries, group),
      ]),
    );
  }, [countries]);

  const currentGroup = groupDefinitions.find(
    (group) => group.id === currentDisplay,
  );
  const currentPercentage = progressByGroup[currentDisplay];

  useEffect(() => {
    onSummaryChange?.({
      label: currentGroup.label,
      percentage: displayPercentage(currentPercentage),
    });
  }, [currentGroup.label, currentPercentage, onSummaryChange]);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!selectorRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="percentage">
      <p>
        You&apos;ve travelled{" "}
        <strong>{displayPercentage(currentPercentage)}%</strong> of the
      </p>
      <div className="groupSelector" ref={selectorRef}>
        <button
          type="button"
          className="groupSelectorButton"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          <span>{currentGroup.label}</span>
          <FiChevronDown aria-hidden="true" />
        </button>

        {open && (
          <div className="groupMenu" role="listbox" aria-label="Travel grouping">
            {groupDefinitions.map((group) => {
              const percentage = progressByGroup[group.id];
              const complete = percentage >= 99.95;
              const selected = group.id === currentDisplay;

              return (
                <button
                  type="button"
                  className="groupOption"
                  key={group.id}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setCurrentDisplay(group.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`groupProgress ${complete ? "complete" : ""}`}
                    style={{ width: `${percentage}%` }}
                    aria-hidden="true"
                  />
                  <span className="groupOptionLabel">
                    {selected && <FiCheck aria-hidden="true" />}
                    <span>{group.label}</span>
                  </span>
                  <strong>{displayPercentage(percentage)}%</strong>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .percentage {
          position: relative;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-self: end;
          gap: 8px;
          color: white;
          white-space: nowrap;
        }

        .percentage p {
          margin: 0;
          font-size: 15px;
        }

        .percentage > p strong {
          color: #46e992;
        }

        .groupSelector {
          position: relative;
        }

        .groupSelectorButton {
          display: flex;
          min-width: 162px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 9px;
          border: 1px solid #46e992;
          border-radius: 5px;
          background: transparent;
          color: white;
          font-size: 15px;
          cursor: pointer;
        }

        .groupSelectorButton:focus-visible,
        .groupOption:focus-visible {
          outline: 2px solid #46e992;
          outline-offset: 2px;
        }

        .groupSelectorButton :global(svg) {
          flex: none;
          transition: transform 150ms ease;
          transform: rotate(${open ? "180deg" : "0"});
        }

        .groupMenu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 310px;
          overflow: hidden;
          border: 1px solid #4a4a4a;
          border-radius: 7px;
          background: #2d2d2d;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.34);
        }

        .groupOption {
          position: relative;
          isolation: isolate;
          display: flex;
          width: 100%;
          min-height: 44px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 12px;
          border: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: white;
          cursor: pointer;
          text-align: left;
        }

        .groupOption:last-child {
          border-bottom: 0;
        }

        .groupOption:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .groupProgress {
          position: absolute;
          z-index: -1;
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
          color: #46e992;
        }

        .groupOption > strong {
          flex: none;
          font-size: 13px;
          font-weight: 500;
        }

        @media only screen and (max-width: 768px) {
          .percentage {
            width: 100%;
            justify-content: center;
            gap: 5px;
          }

          .percentage p,
          .groupSelectorButton {
            font-size: 12px;
          }

          .groupSelectorButton {
            min-width: 135px;
            padding: 6px 7px;
          }

          .groupMenu {
            right: 0;
            width: min(310px, calc(100vw - 20px));
          }
        }
      `}</style>
    </div>
  );
};

export default YouveTravelled;
