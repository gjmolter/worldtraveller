export function marinePropertyPrefix(eezDisplayMode) {
  return eezDisplayMode === "all" ? "code" : "aidCode";
}

export function marineFeatureCodes(feature, eezDisplayMode) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  return [1, 2, 3]
    .map((position) => feature?.properties?.[`${prefix}${position}`])
    .filter(Boolean);
}

export function marineDisplayFilter(eezDisplayMode) {
  return eezDisplayMode === "all"
    ? ["has", "code1"]
    : ["==", ["get", "selectionAid"], true];
}

export function marineBaseOpacity(eezDisplayMode) {
  return eezDisplayMode === "aids" ? 0.03 : 0.075;
}

export function marineHitFilter(eezDisplayMode) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  const conditions = [
    ["!=", ["get", `${prefix}1`], ""],
    ["!=", ["get", `${prefix}1`], "bv"],
  ];

  if (eezDisplayMode !== "all") {
    conditions.unshift(["==", ["get", "selectionAid"], true]);
  }

  return ["all", ...conditions];
}

export function marineSelectedFilter(selected, eezDisplayMode) {
  const prefix = marinePropertyPrefix(eezDisplayMode);
  const selectedCodes = selected.map((code) => code.toLowerCase());
  if (!selectedCodes.length) {
    return ["==", ["get", "code1"], "__no_maritime_selection__"];
  }

  return [
    "any",
    ["in", ["get", `${prefix}1`], ["literal", selectedCodes]],
    ["in", ["get", `${prefix}2`], ["literal", selectedCodes]],
    ["in", ["get", `${prefix}3`], ["literal", selectedCodes]],
  ];
}

export function resolveMarinePlaces({
  feature,
  eezDisplayMode,
  detailedSubdivisionParentIds,
  getCountryById,
  getSubdivisionById,
  subdivisionCandidatesByParent,
}) {
  const detailedParents = new Set(detailedSubdivisionParentIds);
  return marineFeatureCodes(feature, eezDisplayMode)
    .flatMap((code) => {
      const subdivision = getSubdivisionById(code);
      if (!subdivision) {
        const country = getCountryById(code);
        if (country && detailedParents.has(country.id)) {
          return subdivisionCandidatesByParent.get(country.id) || [];
        }
        return country ? [{ ...country, marineCode: code }] : [];
      }

      const place = detailedParents.has(subdivision.parentId)
        ? subdivision
        : getCountryById(subdivision.parentId);
      return place ? [{ ...place, marineCode: code }] : [];
    })
    .filter(
      (place, index, all) =>
        all.findIndex(({ id }) => id === place.id) === index,
    );
}

export function closestPlaceToPoint(places, point) {
  if (!places.length) return null;
  if (places.length === 1 || !point) return places[0];

  const longitudeScale = Math.cos((point.lat * Math.PI) / 180);
  return places.reduce((closest, place) => {
    if (!place.coordinates) return closest;

    const longitudeDifference =
      Math.abs(place.coordinates[0] - point.lng) % 360;
    const wrappedLongitudeDifference = Math.min(
      longitudeDifference,
      360 - longitudeDifference,
    );
    const latitudeDifference = place.coordinates[1] - point.lat;
    const distance =
      (wrappedLongitudeDifference * longitudeScale) ** 2 +
      latitudeDifference ** 2;

    return !closest || distance < closest.distance
      ? { place, distance }
      : closest;
  }, null)?.place || places[0];
}

function wrappedLongitudeOffset(longitude, referenceLongitude) {
  return ((((longitude - referenceLongitude) % 360) + 540) % 360) - 180;
}

function pointInRing(ring, point) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length;
    previous = index++) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    const currentX = wrappedLongitudeOffset(currentPoint[0], point.lng);
    const previousX = wrappedLongitudeOffset(previousPoint[0], point.lng);
    const currentY = currentPoint[1] - point.lat;
    const previousY = previousPoint[1] - point.lat;
    const crossesLatitude = (currentY > 0) !== (previousY > 0);
    const intersectionX = previousX +
      ((currentX - previousX) * -previousY) / (currentY - previousY);
    if (crossesLatitude && intersectionX > 0) inside = !inside;
  }
  return inside;
}

function pointInPolygon(rings, point) {
  return Boolean(
    rings?.length &&
    pointInRing(rings[0], point) &&
    !rings.slice(1).some((ring) => pointInRing(ring, point)),
  );
}

function geometryContainsPoint(geometry, point) {
  if (geometry?.type === "Polygon") {
    return pointInPolygon(geometry.coordinates, point);
  }
  if (geometry?.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygon(polygon, point));
  }
  return false;
}

function geometryDistanceSquared(geometry, point) {
  let closest = Number.POSITIVE_INFINITY;
  const inspectCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      const longitude = wrappedLongitudeOffset(coordinates[0], point.lng);
      const latitude = coordinates[1] - point.lat;
      const longitudeScale = Math.cos((point.lat * Math.PI) / 180);
      closest = Math.min(
        closest,
        (longitude * longitudeScale) ** 2 + latitude ** 2,
      );
      return;
    }
    coordinates.forEach(inspectCoordinates);
  };
  inspectCoordinates(geometry?.coordinates);
  return closest;
}

export function closestMarineFeatureToPoint(features, point) {
  if (!features?.length) return null;
  if (!point) return features[0];

  return features.reduce((closest, feature) => {
    const containsPoint = geometryContainsPoint(feature.geometry, point);
    const distance = geometryDistanceSquared(feature.geometry, point);
    const score = { feature, containsPoint, distance };
    if (!closest || (containsPoint && !closest.containsPoint)) return score;
    if (containsPoint === closest.containsPoint && distance < closest.distance) {
      return score;
    }
    return closest;
  }, null)?.feature || features[0];
}
