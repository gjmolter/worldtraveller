import { getCountryById } from "../utils/mapData";
import subdivisionFlagData from "../data/subdivision-flag-assets.json";
import { getSubdivisionById } from "../utils/subdivisionData";

const customFlagSources = {
  "es-ce": "https://upload.wikimedia.org/wikipedia/commons/d/d3/Flag_of_Ceuta.svg",
  "es-ml": "https://upload.wikimedia.org/wikipedia/commons/f/f7/Flag_of_Melilla.svg",
};

const PlaceFlag = ({
  placeId,
  className = "",
  width = 24,
  decorative = true,
}) => {
  const place = getCountryById(placeId);
  const subdivision = getSubdivisionById(placeId);
  const label = `${place?.name || subdivision?.name || placeId} flag`;
  const customSource = customFlagSources[placeId];
  const subdivisionAsset = subdivisionFlagData.assets[placeId];
  const style = {
    display: "inline-block",
    width: `${width}px`,
    height: `${(width * 2) / 3}px`,
    flex: "none",
    objectFit: "contain",
    verticalAlign: "middle",
  };

  if (subdivision && subdivisionAsset) {
    const statusLabel =
      subdivisionAsset.status === "parent-country-fallback"
        ? "No distinct official subdivision flag; parent-country flag shown"
        : subdivisionAsset.status === "unofficial-conventional"
        ? "Conventional provincial banner; this province has no official flag"
        : undefined;

    return (
      <img
        className={`placeFlag placeFlagImage subdivisionFlag ${className}`}
        src={subdivisionAsset.path}
        alt={decorative ? "" : label}
        aria-hidden={decorative || undefined}
        loading="lazy"
        title={statusLabel}
        style={style}
      />
    );
  }

  if (subdivision) {
    return (
      <span
        className={`subdivisionCodeBadge ${className}`}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
      >
        {subdivision.code}
      </span>
    );
  }

  if (customSource) {
    return (
      <img
        className={`placeFlag placeFlagImage ${className}`}
        src={customSource}
        alt={decorative ? "" : label}
        aria-hidden={decorative || undefined}
        loading="lazy"
        referrerPolicy="no-referrer"
        style={style}
      />
    );
  }

  const flagCode = place?.flagCode || placeId;

  return (
    <span
      className={`placeFlag fi fi-${flagCode} ${className}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      style={style}
    />
  );
};

export default PlaceFlag;
