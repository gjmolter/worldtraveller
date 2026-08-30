import {
  ATLAS_STATE_STORAGE_KEY,
  migrateLegacyAtlasState,
  parseAtlasState,
  serializeAtlasState,
} from "./atlasState.mjs";

export function createLocalAtlasRepository(storage) {
  return {
    load(validation) {
      const savedState = parseAtlasState(
        storage.getItem(ATLAS_STATE_STORAGE_KEY),
        validation,
      );
      if (savedState) return savedState;

      const migratedState = migrateLegacyAtlasState(storage, validation);
      storage.setItem(
        ATLAS_STATE_STORAGE_KEY,
        serializeAtlasState(migratedState),
      );
      return migratedState;
    },
    save(state) {
      storage.setItem(ATLAS_STATE_STORAGE_KEY, serializeAtlasState(state));
    },
  };
}
