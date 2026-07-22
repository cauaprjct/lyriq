import type { SongResponse, TranslateResponse } from "../types";

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
