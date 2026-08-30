import { visitTypeOptions } from "../utils/visitTypes.mjs";

const VisitTypeSelector = ({ value, onChange, disabled = false }) => (
  <div
    className="visitTypeSelector"
    role="radiogroup"
    aria-label="Type for new selections"
  >
    {visitTypeOptions.map((option) => (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={value === option.id}
        aria-label={option.label}
        className={`visitType-${option.id} ${
          value === option.id ? "selected" : ""
        }`}
        disabled={disabled}
        data-tooltip={option.label}
        onClick={() => onChange(option.id)}
      >
        {option.shortLabel}
      </button>
    ))}
    <style jsx global>{`
      .visitTypeSelector {
        display: grid;
        flex: none;
        grid-template-columns: repeat(3, auto);
        gap: 2px;
        padding: 3px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.045);
      }

      .visitTypeSelector button {
        position: relative;
        min-width: 48px;
        padding: 7px 8px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        font: inherit;
        font-size: 9px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }

      .visitTypeSelector button:hover {
        color: white;
      }

      .visitTypeSelector button.selected {
        background-color: var(--selector-color);
        color: white;
      }

      .visitTypeSelector button.selected:hover {
        background-color: var(--selector-hover-color);
      }

      .visitTypeSelector button.visitType-passed {
        --selector-color: var(--visit-passed, #8fc9a7);
        --selector-hover-color: var(--visit-passed-hover, #79b28f);
      }

      .visitTypeSelector button.visitType-passed.selected {
        background-image: repeating-linear-gradient(
          135deg,
          rgba(20, 20, 20, 0.32) 0 2px,
          transparent 2px 7px
        );
      }

      .visitTypeSelector button.visitType-visited {
        --selector-color: var(--visit-visited, #4f9a6f);
        --selector-hover-color: var(--visit-visited-hover, #276944);
      }

      .visitTypeSelector button.visitType-lived {
        --selector-color: var(--visit-lived, #276944);
        --selector-hover-color: var(--visit-lived-hover, #1d5134);
      }

      .visitTypeSelector button.visitType-lived.selected {
        background-image: radial-gradient(
          circle at 2px 2px,
          rgba(20, 20, 20, 0.4) 0 1.25px,
          transparent 1.5px
        );
        background-size: 7px 7px;
      }

      .visitTypeSelector button:disabled {
        cursor: default;
        opacity: 0.42;
      }

      @media (max-width: 900px) {
        .visitTypeSelector button {
          min-width: 0;
          padding-inline: 6px;
          font-size: 8px;
        }
      }
    `}</style>
  </div>
);

export default VisitTypeSelector;
