import { describe, expect, it } from "vitest";
import {
  buildItems,
  flattenBlocks,
  isFiller,
  stripFiller,
  textToBlocks,
  textToLines,
} from "./lyrics";

describe("textToLines", () => {
  it("trims each line and drops the empty ones", () => {
    expect(textToLines("  first \r\n\n  second  \n")).toEqual(["first", "second"]);
  });
});

describe("isFiller", () => {
  it("recognises chant syllables", () => {
    expect(isFiller("Oh oh oh")).toBe(true);
    expect(isFiller("La la la")).toBe(true);
    expect(isFiller("Yeah yeah")).toBe(true);
    expect(isFiller("Uh uh")).toBe(true);
  });

  it("recognises syllables chained with separators", () => {
    expect(isFiller("Eh-eh-o eh-o")).toBe(true);
  });

  it("recognises stretched syllables", () => {
    expect(isFiller("Ohhh ohhh")).toBe(true);
    expect(isFiller("Mmm hmm")).toBe(true);
  });

  it("treats a line with no letters as filler", () => {
    expect(isFiller("...")).toBe(true);
    expect(isFiller("")).toBe(true);
  });

  // Regression: the heuristic used to test only the start of each word, so any
  // word opening with a chant syllable counted as filler. Lines made entirely of
  // such words were dropped from the training set without a trace.
  it("keeps real words that merely begin with a filler syllable", () => {
    expect(isFiller("Day one")).toBe(false); // "da" + "o"
    expect(isFiller("Only over")).toBe(false); // "o" twice
    expect(isFiller("Days")).toBe(false);
    expect(isFiller("Land")).toBe(false);
    expect(isFiller("Ladder")).toBe(false);
    expect(isFiller("Nature")).toBe(false);
  });

  it("keeps a line where only some words are filler", () => {
    expect(isFiller("Oh the quiet street")).toBe(false);
  });
});

describe("stripFiller", () => {
  it("drops filler lines but keeps one blank as a section break", () => {
    const input = ["", "the quiet street", "la la la", "", "we walk again", ""];
    expect(stripFiller(input)).toEqual(["the quiet street", "", "we walk again"]);
  });

  it("never opens or closes with a blank", () => {
    const out = stripFiller(["", "", "one line", "", ""]);
    expect(out).toEqual(["one line"]);
  });
});

describe("textToBlocks", () => {
  it("uses the blank lines of the song as section breaks", () => {
    expect(textToBlocks("a1\na2\n\nb1\nb2")).toEqual([
      ["a1", "a2"],
      ["b1", "b2"],
    ]);
  });

  it("falls back to fixed groups when the source has no blank lines", () => {
    const text = ["l1", "l2", "l3", "l4", "l5", "l6"].join("\n");
    expect(textToBlocks(text)).toEqual([
      ["l1", "l2", "l3", "l4"],
      ["l5", "l6"],
    ]);
  });

  it("keeps a short blank-free lyric as a single block", () => {
    expect(textToBlocks("l1\nl2\nl3")).toEqual([["l1", "l2", "l3"]]);
  });

  it("splits a section that would be punishing to type in one go", () => {
    const long = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"].join("\n");
    expect(textToBlocks(`${long}\n\nm1\nm2`)).toEqual([
      ["l1", "l2", "l3", "l4"],
      ["l5", "l6", "l7", "l8"],
      ["m1", "m2"],
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(textToBlocks("")).toEqual([]);
    expect(textToBlocks("\n\n")).toEqual([]);
  });
});

describe("flattenBlocks", () => {
  it("returns every line in order", () => {
    expect(flattenBlocks([["a", "b"], ["c"]])).toEqual(["a", "b", "c"]);
  });
});

describe("buildItems", () => {
  const blocks = [["a1", "a2"], ["b1"]];

  // The translations arrive as one flat list while the answers are grouped, so
  // an off-by-one in the cursor would silently shift every prompt after the
  // first block.
  it("keeps prompts aligned with answers across blocks", () => {
    const items = buildItems(blocks, ["t1", "t2", "t3"], "translate", "line");
    expect(items.map((i) => i.answer)).toEqual(["a1", "a2", "b1"]);
    expect(items.map((i) => i.prompt)).toEqual(["t1", "t2", "t3"]);
    expect(items.map((i) => i.section)).toEqual([
      "Par\u00E1grafo 1",
      "Par\u00E1grafo 1",
      "Par\u00E1grafo 2",
    ]);
  });

  it("falls back to the original line when a translation is missing", () => {
    const items = buildItems(blocks, ["", "t2", "t3"], "translate", "line");
    expect(items[0].prompt).toBe("a1");
  });

  it("hands over a whole paragraph in block mode", () => {
    const items = buildItems(blocks, ["t1", "t2", "t3"], "translate", "block");
    expect(items).toHaveLength(2);
    expect(items[0].answer).toBe("a1\na2");
    expect(items[0].prompt).toBe("t1\nt2");
  });

  it("numbers the verses and ignores translations in dictation mode", () => {
    const items = buildItems(blocks, [], "dictation", "line");
    expect(items[0].prompt).toBe("Verso 1 \u00B7 ou\u00E7a e escreva");
    expect(items[2].prompt).toBe("Verso 3 \u00B7 ou\u00E7a e escreva");
  });

  it("says how many verses a dictation paragraph holds", () => {
    const items = buildItems(blocks, [], "dictation", "block");
    expect(items[0].prompt).toBe("Par\u00E1grafo 1 \u00B7 ou\u00E7a e escreva (2 versos)");
  });

  it("labels a single-block lyric plainly", () => {
    const items = buildItems([["only", "one"]], ["x", "y"], "translate", "line");
    expect(items[0].section).toBe("Letra");
  });
});
