/**
 * Lightweight local progress, stored in the browser only (no backend, no
 * account). Keyed by YouTube video id so it works for catalog songs and any
 * pasted link alike. Everything is defensive: if localStorage is unavailable
 * (private mode, SSR, blocked), the app still works, it just won't remember.
 */

const KEY = "lyriq.progress.v1";

export interface SongProgress {
  videoId: string;
  artist: string;
  song: string;
  /** Best word-accuracy percentage, 0–100. */
  bestAccuracy: number;
  /** Best perfect-line streak. */
  bestStreak: number;
  /** How many times this song was finished. */
  plays: number;
  /** Epoch ms of the last finished session. */
  lastPlayed: number;
}

export type ProgressMap = Record<string, SongProgress>;

function safeParse(raw: string | null): ProgressMap {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? (data as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return safeParse(window.localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

function save(map: ProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage full or blocked — ignore, session still works */
  }
}

export interface SessionOutcome {
  videoId: string;
  artist: string;
  song: string;
  accuracy: number;
  streak: number;
}

export interface RecordResult {
  isRecord: boolean;
  previousBest: number;
  entry: SongProgress;
}

/** Merge a finished session into stored progress. Returns whether it beat the best. */
export function recordSession(o: SessionOutcome): RecordResult {
  const map = loadProgress();
  const prev = map[o.videoId];
  const previousBest = prev?.bestAccuracy ?? 0;
  const isRecord = o.accuracy > previousBest;

  const entry: SongProgress = {
    videoId: o.videoId,
    artist: o.artist || prev?.artist || "",
    song: o.song || prev?.song || "",
    bestAccuracy: Math.max(previousBest, o.accuracy),
    bestStreak: Math.max(prev?.bestStreak ?? 0, o.streak),
    plays: (prev?.plays ?? 0) + 1,
    lastPlayed: Date.now(),
  };

  map[o.videoId] = entry;
  save(map);
  return { isRecord, previousBest, entry };
}

export interface ProgressSummary {
  songsPracticed: number;
  totalPlays: number;
  recent: SongProgress[];
}

/** Aggregate view for the home screen. `recent` is newest-first. */
export function summarize(map: ProgressMap): ProgressSummary {
  const entries = Object.values(map);
  return {
    songsPracticed: entries.length,
    totalPlays: entries.reduce((sum, e) => sum + e.plays, 0),
    recent: entries.sort((a, b) => b.lastPlayed - a.lastPlayed),
  };
}
