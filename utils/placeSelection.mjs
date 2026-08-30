export function subdivisionThresholdSteps(subdivisions, getCountryById) {
  const areas = [...new Set(
    subdivisions
      .map(({ parentId }) => getCountryById(parentId)?.land || 0)
      .filter((area) => area > 0),
  )].sort((areaA, areaB) => areaA - areaB);
  return [0, ...areas, Number.POSITIVE_INFINITY];
}

export function derivePlaceSelection({
  selected,
  selectedSubdivisions,
  placeGrouping,
  subdivisionAreaThreshold,
  subdivisions,
  getCountryById,
  getSubdivisionById,
  getSubdivisionsForParent,
  displayStateFor,
  projectCountrySelection,
}) {
  const visibleSubdivisionParentIds = placeGrouping === "all"
    ? [...new Set(subdivisions.map(({ parentId }) => parentId))].filter(
        (parentId) =>
          (getCountryById(parentId)?.land || 0) >= subdivisionAreaThreshold,
      )
    : [];
  const visibleSubdivisionParentIdSet = new Set(visibleSubdivisionParentIds);
  const subdivisionParentIds = [...new Set(
    selectedSubdivisions
      .map((id) => getSubdivisionById(id)?.parentId)
      .filter(Boolean),
  )];
  const baseSelected = [...new Set([...selected, ...subdivisionParentIds])];

  const fullySelectedCountrySet = new Set(selected);
  for (const parentId of subdivisionParentIds) {
    const divisions = getSubdivisionsForParent(parentId);
    if (
      divisions.length &&
      divisions.every(({ id }) => selectedSubdivisions.includes(id))
    ) {
      fullySelectedCountrySet.add(parentId);
    }
  }
  const fullySelectedCountries = [...fullySelectedCountrySet];
  const partiallySelectedCountries = subdivisionParentIds.filter(
    (parentId) => !fullySelectedCountrySet.has(parentId),
  );
  const countrySelection = projectCountrySelection(
    fullySelectedCountries,
    placeGrouping,
  );
  const effectiveSelectedSubdivisions = [...new Set([
    ...selectedSubdivisions,
    ...selected.flatMap((parentId) =>
      visibleSubdivisionParentIdSet.has(parentId)
        ? getSubdivisionsForParent(parentId).map(({ id }) => id)
        : [],
    ),
  ])];

  let selectedListEntries;
  if (placeGrouping === "all") {
    const countryEntries = selected
      .filter((id) => !visibleSubdivisionParentIdSet.has(id))
      .map((id) => ({ id, type: "country" }));
    const detailedEntries = effectiveSelectedSubdivisions
      .filter((id) =>
        visibleSubdivisionParentIdSet.has(getSubdivisionById(id)?.parentId),
      )
      .map((id) => ({ id, type: "subdivision" }));
    const groupedSubdivisionParents = [...new Set(
      selectedSubdivisions
        .map((id) => getSubdivisionById(id)?.parentId)
        .filter(
          (parentId) =>
            parentId && !visibleSubdivisionParentIdSet.has(parentId),
        ),
    )].map((id) => ({ id, type: "country" }));
    selectedListEntries = [
      ...countryEntries,
      ...detailedEntries,
      ...groupedSubdivisionParents,
    ];
  } else {
    const displayIds = new Set(
      [...selected, ...subdivisionParentIds].map((id) =>
        displayStateFor(id, placeGrouping),
      ),
    );
    selectedListEntries = [...displayIds].map((id) => ({
      id,
      type: "country",
    }));
  }

  return {
    baseSelected,
    countrySelection,
    effectiveSelectedSubdivisions,
    fullySelectedCountries,
    partiallySelectedCountries,
    selectedListEntries,
    subdivisionParentIds,
    visibleSubdivisionParentIds,
    visibleSubdivisionParentIdSet,
  };
}
