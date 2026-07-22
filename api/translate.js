// Vercel serverless function: translate lyric lines via MyMemory (free, no key).
// POST /api/translate  { lines: string[], source?: "en", target?: "pt-BR" }
// Repeated lines (choruses) are translated once and mapped back to save quota.

const CONCURRENCY = 4;

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
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const { lines, source = "en", target = "pt-BR" } = await readBody(req);
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "Envie um array de linhas." });
    return;
  }

  // Deduplicate so repeated chorus lines cost one request each.
  const unique = [...new Set(lines.map((l) => String(l)))];
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
    const translations = lines.map((l) => cache.get(String(l)) || "");
    res.status(200).json({ translations, partial });
  } catch {
    res.status(502).json({ error: "Falha ao traduzir." });
  }
}
