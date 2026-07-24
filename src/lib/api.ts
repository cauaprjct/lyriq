import type { SongResponse, SyncedResponse, TranslateResponse } from "../types";

export async function fetchSong(
  url: string,
  overrides?: { artist: string; title: string }
): Promise<SongResponse> {
  const params = new URLSearchParams({ url });
  if (overrides?.artist && overrides?.title) {
    params.set("artist", overrides.artist);
    params.set("title", overrides.title);
  }
  const r = await fetch(`/api/song?${params.toString()}`);
  const data = (await r.json()) as SongResponse;
  if (!r.ok) throw new Error(data.error || "Não consegui buscar a música.");
  return data;
}

export async function translateLines(
  lines: string[],
  target: string
): Promise<TranslateResponse> {
  const r = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines, source: "en", target }),
  });
  const data = (await r.json()) as TranslateResponse;
  if (!r.ok) throw new Error(data.error || "Não consegui traduzir a letra.");
  return data;
}

/** Time-synced lyrics (LRC) via LRCLIB. Returns hasSync:false when unavailable. */
export async function fetchSynced(
  artist: string,
  title: string,
  duration?: number
): Promise<SyncedResponse> {
  const params = new URLSearchParams({ artist, title });
  if (duration && Number.isFinite(duration)) params.set("duration", String(Math.round(duration)));
  try {
    const r = await fetch(`/api/synced?${params.toString()}`);
    const data = (await r.json()) as SyncedResponse;
    if (!r.ok) return { hasSync: false, syncedLyrics: "", plainLyrics: "", artist, title };
    return data;
  } catch {
    return { hasSync: false, syncedLyrics: "", plainLyrics: "", artist, title };
  }
}
