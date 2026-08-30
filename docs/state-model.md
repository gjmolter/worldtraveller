# Atlas state model

CPBR Atlas persists local user data as one versioned JSON record under
`cpbr-atlas:state`. The record contains two independently meaningful sections:

- `travel`: selected countries and subdivisions plus their visit levels. This
  keeps the existing versioned travel payload so it can also be used by shared
  links and a future cloud repository.
- `preferences`: grouping, statistics, map, theme, interaction, and panel
  settings.

`utils/atlasState.mjs` owns defaults, normalization, serialization, and legacy
migration. `utils/atlasRepository.mjs` is the storage boundary. UI components
should not read or write browser storage directly.

On first load, the repository reads the old individual keys and travel record,
normalizes them, and writes the unified record atomically. It deliberately does
not delete the legacy values, which provides a rollback path while this
migration is new. Once the unified record exists, it is authoritative.

Shared URLs use the same travel parser and preference normalizer, but loading a
shared map never writes its travel data into the user's local Atlas state.
