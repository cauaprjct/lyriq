import type { Chunk, Mode, TrainerItem } from "../types";

/** Split a pasted/edited lyrics blob into clean, non-empty lines. */
export function textToLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Non-lexical syllables, written in collapsed form: repeated letters are
 * squeezed before the lookup, so "ohhh", "laaa" and "mmm" all land here.
 */
const FILLER_SYLLABLES = new Set([
  "eh",
  "oh",
  "ah",
  "la",
  "na",
  "da",
  "yeah",
  "woah",
  "whoa",
  "hey",
  "uh",
  "o",
  "m",
  "hm",
]);

/** "ohhh" -> "oh", "laaa" -> "la", "mmm" -> "m". */
function collapseRepeats(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

/**
 * True when a word carries no meaning of its own — a chant syllable, possibly
 * stretched ("ohhh") or chained with separators ("eh-eh-o").
 *
 * The whole word has to be filler. An earlier version tested only the start,
 * which quietly classified ordinary words as filler: "only" and "over" begin
 * with "o", "day" with "da", "land" with "la".
 */
function isFillerWord(word: string): boolean {
  const parts = word.split(/[-']/).filter(Boolean);
  if (parts.length === 0) return true;
  return parts.every((part) => FILLER_SYLLABLES.has(collapseRepeats(part)));
}

/** Heuristic: drop obvious non-lexical filler lines (e.g. "Eh-eh-o eh-o", "La la la"). */
export function isFiller(line: string): boolean {
  const words = line.toLowerCase().replace(/[^a-z\s'-]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.every(isFillerWord);
}

/**
 * Remove filler lines while keeping the blank lines that mark section breaks,
 * so the learner still sees (and can train on) the song's own paragraphs.
 */
export function stripFiller(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const blank = line.trim().length === 0;
    if (blank || isFiller(line)) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
    } else {
      out.push(line);
    }
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}

/** Longest paragraph we hand over at once — beyond this, typing gets punishing. */
const MAX_BLOCK = 6;

/**
 * Group the lyrics into paragraphs. Blank lines are the song's own section
 * breaks and take priority; when the source has none (some providers strip
 * them), fall back to fixed groups so "paragraph" still means something.
 */
export function textToBlocks(text: string, fallbackSize = 4): string[][] {
  const rows = text.replace(/\r/g, "").split("\n").map((l) => l.trim());

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const row of rows) {
    if (row.length === 0) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(row);
    }
  }
  if (current.length) blocks.push(current);

  // No blank lines anywhere: slice the flat list into readable groups.
  if (blocks.length <= 1) {
    const flat = blocks[0] ?? [];
    if (flat.length > fallbackSize) return chunkEvery(flat, fallbackSize);
    return flat.length ? [flat] : [];
  }

  // Keep the song's structure, but split any oversized section.
  return blocks.flatMap((b) => (b.length > MAX_BLOCK ? chunkEvery(b, fallbackSize) : [b]));
}

function chunkEvery(lines: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < lines.length; i += size) out.push(lines.slice(i, i + size));
  return out;
}

/** Every lyric line, in order — what we send to the translator. */
export function flattenBlocks(blocks: string[][]): string[] {
  return blocks.flat();
}

export function buildItems(
  blocks: string[][],
  translations: string[],
  mode: Mode,
  chunk: Chunk = "line"
): TrainerItem[] {
  const items: TrainerItem[] = [];
  let cursor = 0; // walks the flat translation list alongside the blocks

  blocks.forEach((block, b) => {
    const section = blocks.length > 1 ? `Parágrafo ${b + 1}` : "Letra";

    if (chunk === "block") {
      const answer = block.join("\n");
      const translated = block
        .map((line, i) => translations[cursor + i]?.trim() || line)
        .join("\n");
      items.push({
        answer,
        prompt:
          mode === "translate" ? translated : `${section} \u00B7 ouça e escreva (${block.length} versos)`,
        section,
      });
    } else {
      block.forEach((answer, i) => {
        items.push({
          answer,
          prompt:
            mode === "translate"
              ? translations[cursor + i]?.trim() || answer
              : `Verso ${items.length + 1} \u00B7 ouça e escreva`,
          section,
        });
      });
    }

    cursor += block.length;
  });

  return items;
}
