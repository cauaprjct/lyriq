import { describe, expect, it } from "vitest";
import { buildHint, gradeLine } from "./diff";

describe("gradeLine", () => {
  it("accepts a line that differs only in case, punctuation and accents", () => {
    const r = gradeLine("Don't look back!", "dont look back");
    expect(r.isPerfect).toBe(true);
    expect(r.correctWords).toBe(3);
    expect(r.totalWords).toBe(3);
    expect(r.tokens.every((t) => t.status === "correct")).toBe(true);
  });

  it("folds diacritics when comparing", () => {
    expect(gradeLine("cafe", "café").isPerfect).toBe(true);
  });

  it("pairs a swapped word into a single wrong token, keeping both spellings", () => {
    const r = gradeLine("the quiet street", "the loud street");
    expect(r.tokens.map((t) => t.status)).toEqual(["correct", "wrong", "correct"]);
    expect(r.tokens[1]).toMatchObject({ expected: "quiet", typed: "loud" });
    expect(r.correctWords).toBe(2);
    expect(r.totalWords).toBe(3);
    expect(r.isPerfect).toBe(false);
  });

  it("reports an omitted word as missing", () => {
    const r = gradeLine("the quiet street", "the street");
    expect(r.tokens.map((t) => t.status)).toEqual(["correct", "missing", "correct"]);
    expect(r.tokens[1].expected).toBe("quiet");
    expect(r.correctWords).toBe(2);
    expect(r.totalWords).toBe(3);
  });

  it("reports a word that was not asked for as extra", () => {
    const r = gradeLine("the street", "the quiet street");
    expect(r.tokens.map((t) => t.status)).toEqual(["correct", "extra", "correct"]);
    expect(r.tokens[1].typed).toBe("quiet");
  });

  // Every expected word is present, so correctWords === totalWords. Accuracy is
  // right, but the attempt is not perfect — the extra word has to sink it.
  it("does not call an attempt perfect when it adds a word", () => {
    const r = gradeLine("the street", "the quiet street");
    expect(r.correctWords).toBe(r.totalWords);
    expect(r.isPerfect).toBe(false);
  });

  it("marks everything missing when nothing was typed", () => {
    const r = gradeLine("two short words", "");
    expect(r.tokens.map((t) => t.status)).toEqual(["missing", "missing", "missing"]);
    expect(r.correctWords).toBe(0);
    expect(r.totalWords).toBe(3);
    expect(r.isPerfect).toBe(false);
  });

  // The LCS alignment is the reason this works: a positional comparison would
  // call every word after the insertion wrong.
  it("stays aligned after an inserted word", () => {
    const r = gradeLine("we walk the long road", "we always walk the long road");
    expect(r.tokens.filter((t) => t.status === "extra")).toHaveLength(1);
    expect(r.correctWords).toBe(5);
    expect(r.tokens.some((t) => t.status === "wrong")).toBe(false);
  });
});

describe("buildHint", () => {
  it("reveals only first letters at the first level", () => {
    expect(buildHint("go home", 1)).toBe("g\u00B7 h\u00B7\u00B7\u00B7");
  });

  it("treats level zero like the first level", () => {
    expect(buildHint("go home", 0)).toBe(buildHint("go home", 1));
  });

  it("reveals the first half of the words at the second level", () => {
    expect(buildHint("go home now", 2)).toBe("go home \u2026");
  });
});
