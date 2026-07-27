// Vercel serverless function: fetch time-synced lyrics (LRC) from LRCLIB.
// GET /api/synced?artist=<a>&title=<t>&duration=<seconds?>
// Returns { hasSync, syncedLyrics, plainLyrics, artist, title } — no API key needed.
// LRCLIB is a free, community lyrics database that returns [mm:ss.xx] timestamps.

const UA = "lyriq (https://lyriq-learn.vercel.app)";

async function lrclibGet(artist, title, duration) {
  const params = new URLSearchParams({ artist_name: artist, track_name: title });
  if (duration) params.set("duration", String(duration));
  const url = `https://lrclib.net/api/get?${params.toString()}`;
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

async function lrclibSearch(artist, title) {
  const params = new URLSearchParams({ track_name: title });
  if (artist) params.set("artist_name", artist);
  const url = `https://lrclib.net/api/search?${params.toString()}`;
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) return null;
  const arr = await r.json().catch(() => null);
  if (!Array.isArray(arr) || arr.length === 0) return null;
  // Prefer the first result that actually has synced lyrics.
  return arr.find((x) => x && x.syncedLyrics) || arr[0];
}

export default async function handler(req, res) {
  // No CORS header on purpose: same origin as the app, so none is needed.
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ error: "Use GET." });
    return;
  }

  res.setHeader("Cache-Control", "s-maxage=604800, stale-while-revalidate");

  const { artist = "", title = "", duration } = req.query;
  if (!title) {
    res.status(400).json({ error: "Informe ao menos o título." });
    return;
  }

  try {
    let hit = await lrclibGet(String(artist), String(title), duration ? Number(duration) : undefined);
    if (!hit || (!hit.syncedLyrics && !hit.plainLyrics)) {
      hit = await lrclibSearch(String(artist), String(title));
    }

    if (!hit) {
      res.status(200).json({ hasSync: false, syncedLyrics: "", plainLyrics: "", artist, title });
      return;
    }

    res.status(200).json({
      hasSync: Boolean(hit.syncedLyrics),
      syncedLyrics: hit.syncedLyrics || "",
      plainLyrics: hit.plainLyrics || "",
      artist: hit.artistName || artist,
      title: hit.trackName || title,
    });
  } catch {
    res.status(200).json({ hasSync: false, syncedLyrics: "", plainLyrics: "", artist, title });
  }
}
