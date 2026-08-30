import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiMap, FiSliders, FiX } from "react-icons/fi";
import { getCountryById } from "../utils/mapData";
import {
  getVisitTypeColor,
  mapColorOptions,
} from "../utils/mapColors";
import { subdivisions } from "../utils/subdivisionData";
import {
  placeGroupingOptions,
  territoryAssociationsReviewedOn,
} from "../utils/territoryData";

const progressModes = [
  {
    id: "land",
    label: "Land area",
    description: "Weight progress by each place’s share of the world’s land.",
  },
  {
    id: "places",
    label: "Places",
    description: "Give every place produced by your grouping settings equal weight.",
  },
];

const statisticsVisitTypes = [
  {
    id: "passed",
    label: "Passed through+",
    description: "Count Passed through, Visited and Lived.",
  },
  {
    id: "visited",
    label: "Visited+",
    description: "Count Visited and Lived, but not Passed through.",
  },
  {
    id: "lived",
    label: "Lived only",
    description: "Count only places marked Lived.",
  },
];

const eezDisplayModes = [
  { id: "none", label: "None" },
  { id: "aids", label: "Selection aids" },
  { id: "all", label: "All EEZs" },
];

const eezDisplayDescriptions = {
  none: "Hide maritime shading. Island and compact-place click targets remain active.",
  aids: "Faintly show maritime areas where they make small or insular places easier to find.",
  all: "Show every available EEZ and make all of those maritime areas selectable.",
};

const mapThemes = [
  { id: "paper", label: "Paper", description: "Warm atlas paper", colors: ["#e9e3cf", "#cfdcd8"] },
  { id: "light", label: "Light", description: "Clean and neutral", colors: ["#f4f3ec", "#dbe7eb"] },
  { id: "dark", label: "Dark", description: "Low-light map", colors: ["#273238", "#17252b"] },
];

const labelModes = [
  { id: "full", label: "Full" },
  { id: "reduced", label: "Reduced" },
  { id: "hidden", label: "Hidden" },
];

const flagLedSwatch =
  "conic-gradient(#3568a8, #d2a92f, #b84d4d, #4f9a6f, #3568a8)";

const supportedParentIds = [...new Set(subdivisions.map(({ parentId }) => parentId))];

function formatArea(area) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(area);
}

function RadioCard({ selected, onClick, label, description }) {
  return (
    <button
      type="button"
      className={`settingCard ${selected ? "selected" : ""}`}
      role="radio"
      aria-checked={selected}
      onClick={onClick}
    >
      <span className="settingCardMark" aria-hidden="true">
        {selected && <FiCheck />}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

const SettingsPanel = ({
  open,
  onClose,
  placeGrouping,
  onPlaceGroupingChange,
  eezDisplayMode,
  onEezDisplayModeChange,
  progressMode,
  onProgressModeChange,
  statisticsVisitType,
  onStatisticsVisitTypeChange,
  colorMode,
  onColorModeChange,
  subdivisionAreaThreshold,
  subdivisionThresholdSteps,
  onSubdivisionAreaThresholdChange,
  mapTheme,
  onMapThemeChange,
  mapLabelDensity,
  onMapLabelDensityChange,
  hoverOpacity,
  onHoverOpacityChange,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const closeButtonRef = useRef(null);
  const thresholdIndex = Math.max(
    0,
    subdivisionThresholdSteps.findIndex(
      (threshold) => threshold === subdivisionAreaThreshold,
    ),
  );
  const detailedCountryCount = useMemo(
    () => supportedParentIds.filter(
      (parentId) =>
        (getCountryById(parentId)?.land || 0) >= subdivisionAreaThreshold,
    ).length,
    [subdivisionAreaThreshold],
  );
  const thresholdLabel = !Number.isFinite(subdivisionAreaThreshold)
    ? "No countries"
    : subdivisionAreaThreshold === 0
      ? `All ${supportedParentIds.length} supported countries`
      : `${formatArea(subdivisionAreaThreshold)} km² and larger · ${detailedCountryCount} countries`;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="settingsBackdrop" onClick={onClose} role="presentation">
      <section
        className="settingsPanel"
        id="map-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settingsHeader">
          <div>
            <p>Atlas preferences</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" className="settingsClose" aria-label="Close settings" onClick={onClose} ref={closeButtonRef}>
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="settingsTabs" role="tablist" aria-label="Settings sections">
          <button type="button" role="tab" aria-selected={activeTab === "general"} className={activeTab === "general" ? "active" : ""} onClick={() => setActiveTab("general")}>
            <FiSliders aria-hidden="true" /> General
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "style"} className={activeTab === "style" ? "active" : ""} onClick={() => setActiveTab("style")}>
            <FiMap aria-hidden="true" /> Style
          </button>
        </div>

        <div className="settingsBody">
          {activeTab === "general" ? (
            <div role="tabpanel" className="settingsTabPanel">
              <section className="settingSection">
                <div className="settingSectionHeading"><span>01</span><div><h3>Place structure</h3><p>Choose what counts as one place.</p></div></div>
                <div className="settingCardList" role="radiogroup" aria-label="Place grouping">
                  {placeGroupingOptions.map((mode) => (
                    <RadioCard key={mode.id} selected={placeGrouping === mode.id} onClick={() => onPlaceGroupingChange(mode.id)} label={mode.label} description={mode.description} />
                  ))}
                </div>

                <div className={`breakdownControl ${placeGrouping !== "all" ? "disabled" : ""}`}>
                  <div className="breakdownLabel">
                    <div><strong>Break down countries by size</strong><small>Countries at or above this land area become individual states, provinces or regions.</small></div>
                    <span>{thresholdLabel}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={subdivisionThresholdSteps.length - 1}
                    step="1"
                    value={thresholdIndex}
                    disabled={placeGrouping !== "all"}
                    aria-label="Minimum country land area to break down into subdivisions"
                    onChange={(event) => onSubdivisionAreaThresholdChange(subdivisionThresholdSteps[Number(event.target.value)])}
                  />
                  <div className="rangeEnds" aria-hidden="true"><span>More detail</span><span>Fewer divisions</span></div>
                </div>
              </section>

              <section className="settingSection">
                <div className="settingSectionHeading"><span>02</span><div><h3>Maritime overlays</h3><p>Control how ocean selection areas appear.</p></div></div>
                <div className="segmentedControl" role="radiogroup" aria-label="Maritime overlay display">
                  {eezDisplayModes.map((mode) => (
                    <button type="button" className={eezDisplayMode === mode.id ? "selected" : ""} key={mode.id} role="radio" aria-checked={eezDisplayMode === mode.id} onClick={() => onEezDisplayModeChange(mode.id)}>{mode.label}</button>
                  ))}
                </div>
                <p className="settingHelp">{eezDisplayDescriptions[eezDisplayMode]}</p>
              </section>

              <section className="settingSection">
                <div className="settingSectionHeading"><span>03</span><div><h3>World progress</h3><p>Choose how the headline percentage is calculated.</p></div></div>
                <div className="settingCardList twoColumn" role="radiogroup" aria-label="World progress mode">
                  {progressModes.map((mode) => (
                    <RadioCard key={mode.id} selected={progressMode === mode.id} onClick={() => onProgressModeChange(mode.id)} label={mode.label} description={mode.description} />
                  ))}
                </div>
                <div className="statisticsLevelControl">
                  <div>
                    <strong>Include in statistics</strong>
                    <small>Travel levels are cumulative: Lived also counts as Visited and Passed through.</small>
                  </div>
                  <div className="segmentedControl statisticsSegments" role="radiogroup" aria-label="Minimum travel level included in statistics">
                    {statisticsVisitTypes.map((visitType) => (
                      <button
                        type="button"
                        className={statisticsVisitType === visitType.id ? "selected" : ""}
                        key={visitType.id}
                        role="radio"
                        aria-checked={statisticsVisitType === visitType.id}
                        aria-label={`Statistics: ${visitType.label}`}
                        onClick={() => onStatisticsVisitTypeChange(visitType.id)}
                      >
                        {visitType.label}
                      </button>
                    ))}
                  </div>
                  <p className="settingHelp statisticsHelp">
                    {statisticsVisitTypes.find(({ id }) => id === statisticsVisitType)?.description}
                  </p>
                </div>
              </section>

              <p className="settingsNote">Grouping changes presentation and counting, never the detailed selections saved underneath. Sovereign relationships reviewed {territoryAssociationsReviewedOn}.</p>
            </div>
          ) : (
            <div role="tabpanel" className="settingsTabPanel">
              <section className="settingSection">
                <div className="settingSectionHeading"><span>01</span><div><h3>Color theme</h3><p>Choose the app’s base colors. Travel patterns distinguish Passed through, Visited and Lived.</p></div></div>
                <div className="colorOptions" role="radiogroup" aria-label="App and travel color theme">
                  {mapColorOptions.map((option) => {
                    const selected = colorMode === option.id;
                    const previewMode = option.countryColors ? "green" : option.id;
                    return (
                      <button type="button" className={`colorOption ${selected ? "selected" : ""}`} key={option.id} role="radio" aria-checked={selected} aria-label={option.label} onClick={() => onColorModeChange(option.id)}>
                        <span className="themeSwatches" aria-hidden="true">
                          {['passed', 'visited', 'lived'].map((visitType) => (
                            <span
                              className={`colorSwatch visitPattern-${visitType}`}
                              key={visitType}
                              style={{
                                "--swatch-base": option.countryColors
                                  ? flagLedSwatch
                                  : getVisitTypeColor(previewMode, visitType),
                              }}
                            />
                          ))}
                        </span>
                        <span>{option.label}</span>{selected && <FiCheck aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="settingSection">
                <div className="settingSectionHeading"><span>02</span><div><h3>Map style</h3><p>Change the basemap without changing your travel theme.</p></div></div>
                <div className="themeOptions" role="radiogroup" aria-label="Map style">
                  {mapThemes.map((theme) => (
                    <button type="button" key={theme.id} role="radio" aria-checked={mapTheme === theme.id} className={mapTheme === theme.id ? "selected" : ""} onClick={() => onMapThemeChange(theme.id)}>
                      <span className="themePreview" style={{ background: `linear-gradient(135deg, ${theme.colors[0]} 0 52%, ${theme.colors[1]} 52%)` }} aria-hidden="true" />
                      <strong>{theme.label}</strong><small>{theme.description}</small>{mapTheme === theme.id && <FiCheck aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="settingSection compactSection">
                <div className="inlineSetting hoverOpacitySetting">
                  <div className="inlineSettingHeading">
                    <div><strong>Hover strength</strong><small>Scale temporary map highlights. 100% matches the current appearance.</small></div>
                    <output htmlFor="hover-opacity">{hoverOpacity}%</output>
                  </div>
                  <input
                    id="hover-opacity"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={hoverOpacity}
                    aria-label="Map hover opacity percentage"
                    onChange={(event) => onHoverOpacityChange(Number(event.target.value))}
                  />
                  <div className="rangeEnds" aria-hidden="true"><span>Off</span><span>Current</span></div>
                </div>
                <div className="inlineSetting">
                  <div><strong>Map labels</strong><small>Reduce visual noise or hide labels completely.</small></div>
                  <div className="miniSegments" role="radiogroup" aria-label="Map label density">
                    {labelModes.map((mode) => <button type="button" key={mode.id} role="radio" aria-checked={mapLabelDensity === mode.id} className={mapLabelDensity === mode.id ? "selected" : ""} onClick={() => onMapLabelDensityChange(mode.id)}>{mode.label}</button>)}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>

      <style jsx global>{`
        .settingsBackdrop{position:fixed;z-index:9;top:96px;right:0;bottom:0;left:0;background:rgba(35,34,31,.28);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
        .settingsPanel{position:absolute;top:14px;right:14px;display:flex;width:min(520px,calc(100vw - 28px));max-height:calc(100% - 28px);flex-direction:column;overflow:hidden;border:1px solid rgba(54,53,51,.2);border-radius:20px;background:#f8f4e8;box-shadow:0 24px 70px rgba(25,24,22,.28);color:#363533}
        .settingsPanel .settingsHeader{position:static;z-index:auto;display:flex;height:auto;flex:none;align-items:center;justify-content:space-between;padding:20px 22px 16px;background:transparent}.settingsHeader h2,.settingsHeader p{margin:0}.settingsHeader p{margin-bottom:3px;color:var(--accent-strong);font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.settingsHeader h2{font-size:28px;line-height:1}.settingsClose{display:grid;width:38px;height:38px;place-items:center;padding:0;border:1px solid rgba(54,53,51,.2);border-radius:50%;background:transparent;color:inherit;cursor:pointer}.settingsClose:hover{border-color:var(--accent);background:var(--accent);color:white}
        .settingsTabs{display:grid;flex:none;grid-template-columns:1fr 1fr;padding:0 22px;border-bottom:1px solid rgba(54,53,51,.13)}.settingsTabs button{display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;border:0;border-bottom:3px solid transparent;background:transparent;color:#777168;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.settingsTabs button.active{border-color:var(--accent);color:#302f2c}.settingsBody{overflow-y:auto;scrollbar-color:rgba(54,53,51,.28) transparent}.settingsTabPanel{padding:3px 0 18px}.settingSection{padding:19px 22px;border-bottom:1px solid rgba(54,53,51,.13)}.settingSection:last-of-type{border-bottom:0}.settingSectionHeading{display:grid;grid-template-columns:28px 1fr;gap:8px;margin-bottom:14px}.settingSectionHeading>span{color:var(--accent-strong);font-size:10px;font-weight:900;letter-spacing:.08em}.settingSectionHeading h3,.settingSectionHeading p{margin:0}.settingSectionHeading h3{font-size:16px}.settingSectionHeading p{margin-top:2px;color:#726d64;font-size:12px;line-height:1.35}
        .settingCardList{display:grid;gap:7px}.settingCardList.twoColumn{grid-template-columns:1fr 1fr}.settingCard{display:grid;grid-template-columns:23px 1fr;gap:10px;align-items:start;padding:11px;border:1px solid transparent;border-radius:12px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.settingCard:hover{border-color:color-mix(in srgb,var(--accent) 35%,transparent);background:color-mix(in srgb,var(--accent) 6%,transparent)}.settingCard.selected{border-color:color-mix(in srgb,var(--accent-strong) 30%,transparent);background:color-mix(in srgb,var(--accent) 10%,transparent)}.settingCardMark{display:grid;width:21px;height:21px;place-items:center;border:1.5px solid #817c71;border-radius:50%;color:white}.settingCard.selected .settingCardMark{border-color:var(--accent);background:var(--accent)}.settingCard strong,.settingCard small{display:block}.settingCard strong{margin-bottom:3px;font-size:14px}.settingCard small{color:#6a655c;font-size:11px;line-height:1.38}
        .breakdownControl{margin:12px 0 0 34px;padding:13px 14px;border:1px solid rgba(54,53,51,.14);border-radius:12px;background:rgba(255,255,255,.3);transition:opacity .15s}.breakdownControl.disabled{opacity:.42}.breakdownLabel{display:flex;align-items:start;justify-content:space-between;gap:12px}.breakdownLabel strong,.breakdownLabel small{display:block}.breakdownLabel strong{font-size:12px}.breakdownLabel small{max-width:270px;margin-top:3px;color:#716c63;font-size:10px;line-height:1.35}.breakdownLabel>span{flex:none;color:var(--accent-strong);font-size:10px;font-weight:800;text-align:right}.breakdownControl input{width:100%;margin:13px 0 2px;accent-color:var(--accent)}.rangeEnds{display:flex;justify-content:space-between;color:#8a857b;font-size:9px;font-weight:700;text-transform:uppercase}
        .segmentedControl,.miniSegments{display:grid;gap:3px;padding:3px;border:1px solid rgba(54,53,51,.16);border-radius:11px;background:rgba(54,53,51,.055)}.segmentedControl{grid-template-columns:.7fr 1.35fr .8fr}.segmentedControl button,.miniSegments button{border:0;border-radius:8px;background:transparent;color:#5d5952;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.segmentedControl button{min-height:40px;padding:7px}.segmentedControl button.selected,.miniSegments button.selected{background:var(--accent);color:white;box-shadow:0 2px 7px color-mix(in srgb,var(--accent-strong) 24%,transparent)}.settingHelp{min-height:31px;margin:9px 2px 0;color:#6a655c;font-size:11px;line-height:1.4}.statisticsLevelControl{margin-top:12px;padding:13px 14px;border:1px solid rgba(54,53,51,.14);border-radius:12px;background:rgba(255,255,255,.3)}.statisticsLevelControl>div:first-child strong,.statisticsLevelControl>div:first-child small{display:block}.statisticsLevelControl>div:first-child strong{font-size:12px}.statisticsLevelControl>div:first-child small{margin-top:3px;color:#716c63;font-size:10px;line-height:1.35}.statisticsSegments{grid-template-columns:repeat(3,1fr);margin-top:11px}.statisticsSegments button{min-width:0;font-size:10px}.statisticsHelp{min-height:0;margin-bottom:0}.settingsNote{margin:0;padding:14px 22px 0;color:#817b71;font-size:10px;line-height:1.45}
        .colorOptions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.colorOption{position:relative;display:grid;min-width:0;grid-template-columns:38px 1fr;gap:7px;align-items:center;padding:9px;border:1px solid rgba(54,53,51,.15);border-radius:10px;background:rgba(255,255,255,.28);color:#504d46;font:inherit;font-size:10px;font-weight:800;text-align:left;cursor:pointer}.colorOption.selected{border-color:#363533;background:#fffdf7}.colorOption>:global(svg){position:absolute;top:4px;right:4px;font-size:10px}.themeSwatches{display:flex;align-items:center}.colorSwatch{width:16px;height:16px;margin-left:-5px;border:1px solid rgba(0,0,0,.16);border-radius:50%;background:var(--swatch-base);box-shadow:0 0 0 1px rgba(255,255,255,.5)}.colorSwatch:first-child{margin-left:0}.colorSwatch.visitPattern-passed{background:repeating-linear-gradient(135deg,rgba(20,20,20,.38) 0 1.5px,transparent 1.5px 5px),var(--swatch-base)}.colorSwatch.visitPattern-lived{background:radial-gradient(circle at 2px 2px,rgba(20,20,20,.46) 0 1px,transparent 1.25px) 0 0/5px 5px,var(--swatch-base)}
        .themeOptions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.themeOptions button{position:relative;display:grid;gap:3px;padding:8px;border:1px solid rgba(54,53,51,.16);border-radius:12px;background:rgba(255,255,255,.28);color:inherit;font:inherit;text-align:left;cursor:pointer}.themeOptions button.selected{border-color:var(--accent-strong);box-shadow:0 0 0 1px var(--accent-strong)}.themePreview{height:54px;margin-bottom:4px;border:1px solid rgba(54,53,51,.16);border-radius:8px}.themeOptions strong{font-size:12px}.themeOptions small{color:#777168;font-size:10px}.themeOptions button>:global(svg){position:absolute;top:13px;right:13px;padding:2px;border-radius:50%;background:var(--accent);color:white;font-size:16px}.compactSection{display:grid;gap:16px}.inlineSetting{display:grid;gap:10px}.inlineSetting>div:first-child strong,.inlineSetting>div:first-child small{display:block}.inlineSetting>div:first-child strong{font-size:13px}.inlineSetting>div:first-child small{margin-top:2px;color:#716c63;font-size:10px}.inlineSettingHeading{display:flex;align-items:start;justify-content:space-between;gap:12px}.inlineSettingHeading output{flex:none;min-width:42px;color:var(--accent-strong);font-size:12px;font-weight:850;text-align:right}.hoverOpacitySetting{padding-bottom:16px;border-bottom:1px solid rgba(54,53,51,.13)}.hoverOpacitySetting input{width:100%;margin:0;accent-color:var(--accent)}.miniSegments{grid-template-columns:repeat(3,1fr)}.miniSegments button{min-height:34px;padding:6px}button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        @media(max-width:700px){.settingsBackdrop{top:112px}.settingsPanel{top:8px;right:8px;width:calc(100vw - 16px);max-height:calc(100% - 16px)}.settingsHeader{padding:16px 17px 13px}.settingsTabs,.settingSection{padding-left:17px;padding-right:17px}.settingCardList.twoColumn{grid-template-columns:1fr}.breakdownControl{margin-left:0}.breakdownLabel{display:block}.breakdownLabel>span{display:block;margin-top:7px;text-align:left}.themeOptions{grid-template-columns:1fr}.themePreview{height:42px}.colorOptions{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </div>
  );
};

export default SettingsPanel;
