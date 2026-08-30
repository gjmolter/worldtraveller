import {
  parseTravelState,
  serializeTravelState,
  TRAVEL_STATE_STORAGE_KEY,
} from "./travelStorage.mjs";

export function createLocalTravelRepository(storage) {
  return {
    load(validation) {
      return parseTravelState(
        storage.getItem(TRAVEL_STATE_STORAGE_KEY),
        validation,
      );
    },
    save(travelState) {
      storage.setItem(
        TRAVEL_STATE_STORAGE_KEY,
        serializeTravelState(travelState),
      );
    },
  };
}
