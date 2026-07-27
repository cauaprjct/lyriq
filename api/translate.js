// Vercel serverless function: translate lyric lines via MyMemory (free, no key).
// POST /api/translate  { lines: string[], source?: "en", target?: "pt-BR" }
// Repeated lines (choruses) are translated once and mapped back to save quota.
//
// MyMemory's free tier is rate-limited per calling IP, and that IP is this
// function's — shared by every user of the app. So an unbounded payload here is
// not just a big request, it can drain the quota everyone depends on and leave
// the app serving untranslated lyrics. The limits below bound a single request;
// they are deliberately generous next to a real song (a long one runs a few
// hundred lines and a few thousand characters).

const CONCURRENCY = 4;

/** Hard bounds on one request. Generous for a song, cheap to enforce. */
const MAX_LINES = 400;
const MAX_TOTAL_CHARS = 20000;
const MAX_LINE_CHARS = 500;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function translateOne(text, source, target) {
  const q = encodeURIComponent(text.slice(0, 490));
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${source}|${target}`;
  const r = await fetch(url, { headers: { "user-agent": "lyriq/1.0" } });
  if (!r.ok) throw new Error(`status ${r.status}`);
  const data = await r.json();
  const translated = data?.responseData?.translatedText;
  const quotaFinished = Boolean(data?.quotaFinished);
  if (!translated || data?.responseStatus === 403) {
    return { text: null, quotaFinished: true };
  }
  return { text: translated, quotaFinished };
}

export default async function handler(req, res) {
  // No CORS header on purpose: the app is served from this same origin, so it
  // never needs one. A wildcard would only let other sites spend our quota.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const { lines, source = "en", target = "pt-BR" } = await readBody(req);
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "Envie um array de linhas." });
    return;
  }

  if (lines.length > MAX_LINES) {
    res.status(413).json({
      error: `Letra longa demais para traduzir de uma vez (limite de ${MAX_LINES} linhas).`,
    });
    return;
  }

  const asText = lines.map((l) => String(l));
  const totalChars = asText.reduce((sum, l) => sum + l.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    res.status(413).json({
      error: `Letra longa demais para traduzir de uma vez (limite de ${MAX_TOTAL_CHARS} caracteres).`,
    });
    return;
  }
  if (asText.some((l) => l.length > MAX_LINE_CHARS)) {
    res.status(413).json({
      error: `Verso longo demais (limite de ${MAX_LINE_CHARS} caracteres por linha).`,
    });
    return;
  }

  // Deduplicate so repeated chorus lines cost one request each.
  const unique = [...new Set(asText)];
  const cache = new Map();
  let partial = false;

  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      const i = cursor++;
      const line = unique[i];
      try {
        const { text, quotaFinished } = await translateOne(line, source, target);
        cache.set(line, text ?? "");
        if (!text || quotaFinished) partial = true;
      } catch {
        cache.set(line, "");
        partial = true;
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker)
    );
    const translations = asText.map((l) => cache.get(l) || "");
    res.status(200).json({ translations, partial });
  } catch {
    res.status(502).json({ error: "Falha ao traduzir." });
  }
}
