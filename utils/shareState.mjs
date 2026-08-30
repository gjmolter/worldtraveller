import {
  parseTravelState,
  serializeTravelState,
} from "./travelStorage.mjs";
import { normalizeAtlasPreferences } from "./atlasState.mjs";

export const SHARE_STATE_VERSION = 1;
export const SHARE_QUERY_PARAMETER = "map";

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

function normalizePreferences(preferences = {}) {
  const normalized = normalizeAtlasPreferences(preferences);
  return {
    placeGrouping: normalized.placeGrouping,
    progressMode: normalized.progressMode,
    statisticsVisitType: normalized.statisticsVisitType,
    colorMode: normalized.colorMode,
    mapTheme: normalized.mapTheme,
  };
}

export function createShareToken({ travelState, preferences }) {
  return encodeBase64Url(JSON.stringify({
    version: SHARE_STATE_VERSION,
    travel: JSON.parse(serializeTravelState(travelState)),
    preferences: normalizePreferences(preferences),
  }));
}

export function parseShareToken(token, validation = {}) {
  if (!token) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(token));
    if (payload?.version !== SHARE_STATE_VERSION) return null;
    const travelState = parseTravelState(
      JSON.stringify(payload.travel),
      validation,
    );
    if (!travelState) return null;
    return {
      travelState,
      preferences: normalizePreferences(payload.preferences),
    };
  } catch {
    return null;
  }
}

export function createShareUrl(origin, shareToken) {
  const url = new URL(origin);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  url.searchParams.set(SHARE_QUERY_PARAMETER, shareToken);
  return url.toString();
}
