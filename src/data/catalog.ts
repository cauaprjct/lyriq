import type { CatalogSong } from "../types";

/**
 * Curated starting catalog. Every entry was verified against the live
 * pipeline (YouTube oEmbed + lyrics.ovh) so the lyrics resolve. We never
 * bundle the lyrics themselves — they are fetched on demand, matching the
 * app's "stores nothing" stance. The artist/song here are passed as search
 * overrides so the lookup never depends on parsing the video title.
 */
export const CATALOG: CatalogSong[] = [
  // — Iniciante —
  { videoId: "yKNxeF4KMsY", artist: "Coldplay", song: "Yellow", level: "iniciante", year: 2000 },
  { videoId: "RBumgq5yVrA", artist: "Passenger", song: "Let Her Go", level: "iniciante", year: 2012 },
  { videoId: "2Vv-BfVoq4g", artist: "Ed Sheeran", song: "Perfect", level: "iniciante", year: 2017 },

  // — Intermediário —
  { videoId: "hLQl3WQQoQ0", artist: "Adele", song: "Someone Like You", level: "intermediario", year: 2011 },
  { videoId: "450p7goxZqg", artist: "John Legend", song: "All of Me", level: "intermediario", year: 2013 },
  { videoId: "nSDgHBxUbVQ", artist: "Ed Sheeran", song: "Photograph", level: "intermediario", year: 2014 },
  { videoId: "IcrbM1l_BoI", artist: "Avicii", song: "Wake Me Up", level: "intermediario", year: 2013 },

  // — Avançado —
  { videoId: "hT_nvWreIhg", artist: "OneRepublic", song: "Counting Stars", level: "avancado", year: 2013 },
  { videoId: "LHCob76kigA", artist: "Lukas Graham", song: "7 Years", level: "avancado", year: 2015 },
  { videoId: "7wtfhZwyrcc", artist: "Imagine Dragons", song: "Believer", level: "avancado", year: 2017 },
];

/** YouTube thumbnail for a catalog card. */
export function thumbFor(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Canonical watch URL, used to feed the existing search pipeline. */
export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
