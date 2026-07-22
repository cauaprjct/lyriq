import type { Mode, TrainerItem } from "../types";

/** Split a pasted/edited lyrics blob into clean, non-empty lines. */
export function textToLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Heuristic: drop obvious non-lexical filler lines (e.g. "Eh-eh-o eh-o", "La la la"). */
export function isFiller(line: string): boolean {
  const words = line.toLowerCase().replace(/[^a-z\s'-]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const fillerRe = /^(eh|oh|ah|la|na|da|yeah|woah|whoa|ooh|oo|hey|mmm|hmm|uh|o)+[-']?.*$/i;
  return words.every((w) => fillerRe.test(w));
}

export function buildItems(
  lines: string[],
  translations: string[],
  mode: Mode
): TrainerItem[] {
  return lines.map((answer, i) => ({
    answer,
    prompt:
      mode === "translate"
        ? translations[i]?.trim() || answer
        : `Verso ${i + 1} \u00B7 ouça e escreva`,
  }));
}
