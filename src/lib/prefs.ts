import type { Chunk, Mode, Pace, Prefs } from "../types";

/**
 * Training preferences, remembered in the browser only (same stance as
 * progress: nothing leaves the device). Reads are defensive — a stale or
 * hand-edited value falls back to the default instead of breaking the app.
 */

const KEY = "lyriq.prefs.v1";

export const DEFAULT_PREFS: Prefs = {
  mode: "translate",
  chunk: "line",
  pace: "self",
};

const MODES: Mode[] = ["translate", "dictation"];
const CHUNKS: Chunk[] = ["line", "block"];
const PACES: Pace[] = ["self", "song"];

export function loadPrefs(): Prefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      mode: MODES.includes(parsed?.mode as Mode) ? (parsed.mode as Mode) : DEFAULT_PREFS.mode,
      chunk: CHUNKS.includes(parsed?.chunk as Chunk)
        ? (parsed.chunk as Chunk)
        : DEFAULT_PREFS.chunk,
      pace: PACES.includes(parsed?.pace as Pace) ? (parsed.pace as Pace) : DEFAULT_PREFS.pace,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage full or blocked — preferences just won't persist */
  }
}
