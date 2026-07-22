export type TokenStatus = "correct" | "wrong" | "missing" | "extra";

export interface ResultToken {
  status: TokenStatus;
  /** The expected word (present for correct / wrong / missing). */
  expected?: string;
  /** What the learner actually typed (present for wrong / extra). */
  typed?: string;
}

export interface LineResult {
  tokens: ResultToken[];
  correctWords: number;
  totalWords: number;
  /** True only when every expected word was typed correctly and nothing extra. */
  isPerfect: boolean;
}

interface Tok {
  raw: string;
  norm: string;
}

/** Normalize a word for comparison: lowercase, drop punctuation & apostrophes, fold accents. */
function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function tokenize(line: string): Tok[] {
  return line
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, norm: normalize(raw) }));
}

type Op =
  | { type: "equal"; a: Tok; b: Tok }
  | { type: "del"; a: Tok }
  | { type: "ins"; b: Tok };

/** Classic LCS diff between expected (A) and typed (B) token streams. */
function diffTokens(a: Tok[], b: Tok[]): Op[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i].norm === b[j].norm
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i].norm === b[j].norm) {
      ops.push({ type: "equal", a: a[i], b: b[j] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: "del", a: a[i] });
      i++;
    } else {
      ops.push({ type: "ins", b: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "del", a: a[i++] });
  while (j < m) ops.push({ type: "ins", b: b[j++] });
  return ops;
}

/**
 * Grade a typed line against the expected line, pairing adjacent
 * deletions/insertions into "wrong word" tokens for clearer feedback.
 */
export function gradeLine(expected: string, typed: string): LineResult {
  const a = tokenize(expected);
  const b = tokenize(typed);
  const ops = diffTokens(a, b);

  const tokens: ResultToken[] = [];
  let idx = 0;
  while (idx < ops.length) {
    const op = ops[idx];

    if (op.type === "equal") {
      tokens.push({ status: "correct", expected: op.a.raw, typed: op.b.raw });
      idx++;
      continue;
    }

    // Gather a contiguous run of dels + ins and pair them as substitutions.
    const dels: Tok[] = [];
    const ins: Tok[] = [];
    while (idx < ops.length && ops[idx].type !== "equal") {
      const cur = ops[idx];
      if (cur.type === "del") dels.push(cur.a);
      else if (cur.type === "ins") ins.push(cur.b);
      idx++;
    }

    const paired = Math.min(dels.length, ins.length);
    for (let k = 0; k < paired; k++) {
      tokens.push({ status: "wrong", expected: dels[k].raw, typed: ins[k].raw });
    }
    for (let k = paired; k < dels.length; k++) {
      tokens.push({ status: "missing", expected: dels[k].raw });
    }
    for (let k = paired; k < ins.length; k++) {
      tokens.push({ status: "extra", typed: ins[k].raw });
    }
  }

  const correctWords = tokens.filter((t) => t.status === "correct").length;
  const totalWords = a.length;
  const isPerfect =
    correctWords === totalWords &&
    !tokens.some((t) => t.status === "extra" || t.status === "wrong");

  return { tokens, correctWords, totalWords, isPerfect };
}

/** Progressive hint: reveal first letters, then the first half of the words. */
export function buildHint(expected: string, level: number): string {
  const words = expected.trim().split(/\s+/);
  if (level <= 1) {
    return words.map((w) => w[0] + "\u00B7".repeat(Math.max(1, w.length - 1))).join(" ");
  }
  const half = Math.ceil(words.length / 2);
  return words.slice(0, half).join(" ") + " \u2026";
}
