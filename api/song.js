// Vercel serverless function: resolve a YouTube URL into song metadata + lyrics.
// GET /api/song?url=<youtube url>  (or ?url=<videoId>)
// Optional overrides: &artist=<a>&title=<t> to retry lyric lookup after edits.

const TITLE_NOISE = [
  /\(official.*?\)/gi,
  /\[official.*?\]/gi,
  /\(.*?lyric.*?\)/gi,
  /\[.*?lyric.*?\]/gi,
  /\(.*?video.*?\)/gi,
  /\[.*?video.*?\]/gi,
  /\(.*?audio.*?\)/gi,
  /\[.*?audio.*?\]/gi,
  /\(.*?visuali[sz]er.*?\)/gi,
  /\(.*?remaster.*?\)/gi,
  /\bofficial\b/gi,
  /\bmusic video\b/gi,
  /\blyric[s]?\b/gi,
  /\bvisuali[sz]er\b/gi,
  /\baudio\b/gi,
  /\bhd\b/gi,
  /\b4k\b/gi,
  /\bmv\b/gi,
];

function extractVideoId(input) {
  if (!input) return null;
  const raw = String(input).trim();
  // Bare 11-char id
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") return u.pathname.slice(1, 12) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["embed", "shorts", "v"].includes(p));
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].slice(0, 11);
  } catch {
    /* not a URL */
  }
  const m = raw.match(/[\w-]{11}/);
  return m ? m[0] : null;
}

function cleanTitle(title) {
  let t = title;
  for (const re of TITLE_NOISE) t = t.replace(re, " ");
  return t.replace(/\s{2,}/g, " ").replace(/\s*[-|]\s*$/, "").trim();
}

function stripArtist(author) {
  return author
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .trim();
}

function parseArtistTitle(rawTitle, author) {
  const cleaned = cleanTitle(rawTitle);
  const sep = cleaned.match(/\s+[-–—]\s+/);
  if (sep) {
    const [artist, ...rest] = cleaned.split(/\s+[-–—]\s+/);
    const song = rest.join(" - ").trim();
    if (artist && song) return { artist: artist.trim(), song };
  }
  return { artist: stripArtist(author || ""), song: cleaned };
}

/**
 * Split the lyrics into lines, keeping a single empty line wherever the source
 * had a blank one. Those blanks are the song's own section breaks (verse,
 * chorus…) and the app uses them to offer "type a whole paragraph".
 */
function toLines(lyrics) {
  const raw = lyrics
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());

  const out = [];
  for (const line of raw) {
    if (line.length === 0) {
      // collapse runs of blanks, and never start with one
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
    } else {
      out.push(line);
    }
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}

async function fetchOEmbed(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const r = await fetch(url, { headers: { "user-agent": "lyriq/1.0" } });
  if (!r.ok) return null;
  return r.json();
}

async function fetchLyrics(artist, song) {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
  const r = await fetch(url, { headers: { "user-agent": "lyriq/1.0" } });
  if (!r.ok) return null;
  const data = await r.json().catch(() => null);
  if (!data || !data.lyrics || !data.lyrics.trim()) return null;
  return data.lyrics;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");

  const { url, artist: artistOverride, title: titleOverride } = req.query;
  const videoId = extractVideoId(url);

  if (!videoId) {
    res.status(400).json({ error: "URL do YouTube inválida." });
    return;
  }

  try {
    const oembed = await fetchOEmbed(videoId);
    if (!oembed) {
      res.status(404).json({ error: "Não achei esse vídeo no YouTube." });
      return;
    }

    const parsed =
      artistOverride && titleOverride
        ? { artist: String(artistOverride), song: String(titleOverride) }
        : parseArtistTitle(oembed.title || "", oembed.author_name || "");

    const meta = {
      videoId,
      videoTitle: oembed.title || "",
      author: oembed.author_name || "",
      thumbnail: oembed.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      artist: parsed.artist,
      song: parsed.song,
    };

    const lyrics = await fetchLyrics(parsed.artist, parsed.song);
    if (!lyrics) {
      res.status(200).json({
        ...meta,
        found: false,
        lines: [],
        message:
          "Não encontrei a letra automaticamente. Ajuste artista/música e tente de novo, ou cole a letra.",
      });
      return;
    }

    res.status(200).json({ ...meta, found: true, lines: toLines(lyrics) });
  } catch (err) {
    res.status(502).json({ error: "Falha ao buscar a música. Tente de novo." });
  }
}
