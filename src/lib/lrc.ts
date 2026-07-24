/**
 * Parse LRC (time-synced lyrics) and derive structure from the timing itself.
 * We can't read the YouTube audio waveform (cross-origin iframe), but the gaps
 * between timestamps tell us where the natural pauses and section breaks are —
 * that's what powers the "paragraphs" grouping.
 */

export interface SyncedLine {
  /** Seconds from the start of the track. */
  time: number;
  text: string;
}

const TS = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/** Parse an LRC string into time-ordered lines (blank/instrumental entries kept). */
export function parseLrc(lrc: string): SyncedLine[] {
  const out: SyncedLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    TS.lastIndex = 0;
    const stamps = [...raw.matchAll(TS)];
    if (stamps.length === 0) continue;
    const text = raw.replace(TS, "").trim();
    for (const m of stamps) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) / 1000 : 0;
      out.push({ time: min * 60 + sec + frac, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

/** Only the lines that actually have words (drops instrumental gap markers). */
export function displayLines(all: SyncedLine[]): SyncedLine[] {
  return all.filter((l) => l.text.length > 0);
}

/** Index of the currently-sung line for a given playback time (-1 before the first). */
export function activeLineIndex(display: SyncedLine[], t: number): number {
  let idx = -1;
  for (let i = 0; i < display.length; i++) {
    if (display[i].time <= t) idx = i;
    else break;
  }
  return idx;
}

/**
 * Indices (into `display`) that begin a new paragraph. Adaptive: a break is a
 * silence noticeably longer than this song's typical line-to-line spacing.
 */
export function paragraphStarts(display: SyncedLine[]): Set<number> {
  const starts = new Set<number>([0]);
  if (display.length < 3) return starts;

  const deltas: number[] = [];
  for (let i = 1; i < display.length; i++) deltas.push(display[i].time - display[i - 1].time);

  const sorted = [...deltas].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 3;
  const threshold = Math.min(12, Math.max(5, median * 1.9));

  for (let i = 1; i < display.length; i++) {
    if (display[i].time - display[i - 1].time > threshold) starts.add(i);
  }
  return starts;
}

/** Normalize a whole line for matching a trainer answer to its timestamp. */
export function normLine(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map normalized line text -> the times it occurs (choruses repeat). */
export function buildTimeIndex(display: SyncedLine[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const line of display) {
    const key = normLine(line.text);
    if (!key) continue;
    const arr = map.get(key);
    if (arr) arr.push(line.time);
    else map.set(key, [line.time]);
  }
  return map;
}

/**
 * Best timestamp for a trainer line. For repeated lines, prefer the first
 * occurrence at/after `afterT` (so "listen to this verse" tracks progress).
 */
export function findVerseTime(
  index: Map<string, number[]>,
  text: string,
  afterT = 0
): number | null {
  const times = index.get(normLine(text));
  if (!times || times.length === 0) return null;
  return times.find((t) => t >= afterT - 0.25) ?? times[0];
}
