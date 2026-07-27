import { describe, expect, it } from "vitest";
import {
  activeLineIndex,
  buildTimeIndex,
  displayLines,
  findVerseSpan,
  findVerseTime,
  nextLineTime,
  normLine,
  paragraphStarts,
  parseLrc,
  type SyncedLine,
} from "./lrc";

const lines = (...pairs: [number, string][]): SyncedLine[] =>
  pairs.map(([time, text]) => ({ time, text }));

describe("parseLrc", () => {
  it("reads minutes, seconds and hundredths", () => {
    expect(parseLrc("[00:12.50]first line")).toEqual([{ time: 12.5, text: "first line" }]);
  });

  it("accepts a colon before the fraction and a single-digit fraction", () => {
    expect(parseLrc("[00:12:50]a")[0].time).toBe(12.5);
    expect(parseLrc("[00:05.5]a")[0].time).toBe(5.5);
  });

  it("handles a missing fraction", () => {
    expect(parseLrc("[01:02]a")[0].time).toBe(62);
  });

  it("repeats a line that carries several timestamps", () => {
    const out = parseLrc("[00:10.00][00:20.00]chorus");
    expect(out).toEqual([
      { time: 10, text: "chorus" },
      { time: 20, text: "chorus" },
    ]);
  });

  it("skips lines with no timestamp, such as LRC metadata", () => {
    expect(parseLrc("[ar:Some Artist]\nplain text\n[00:01.00]real")).toEqual([
      { time: 1, text: "real" },
    ]);
  });

  it("returns the lines in time order even when the file is not", () => {
    expect(parseLrc("[00:20.00]second\n[00:10.00]first").map((l) => l.text)).toEqual([
      "first",
      "second",
    ]);
  });

  it("keeps timed entries with no words, which mark instrumental gaps", () => {
    expect(parseLrc("[00:30.00]")).toEqual([{ time: 30, text: "" }]);
  });
});

describe("displayLines", () => {
  it("drops the instrumental gap markers", () => {
    expect(displayLines(lines([10, "a"], [20, ""], [30, "b"]))).toEqual(
      lines([10, "a"], [30, "b"])
    );
  });
});

describe("activeLineIndex", () => {
  const display = lines([10, "a"], [20, "b"], [30, "c"]);

  it("returns -1 before the first line is sung", () => {
    expect(activeLineIndex(display, 5)).toBe(-1);
  });

  it("returns the line that started most recently", () => {
    expect(activeLineIndex(display, 10)).toBe(0);
    expect(activeLineIndex(display, 25)).toBe(1);
  });

  it("stays on the last line once the song runs out", () => {
    expect(activeLineIndex(display, 999)).toBe(2);
  });
});

describe("paragraphStarts", () => {
  it("always opens a paragraph at the first line", () => {
    expect(paragraphStarts(lines([0, "a"]))).toEqual(new Set([0]));
  });

  // The threshold is relative to this song's own pacing, so a slow ballad and a
  // fast track both get sensible breaks.
  it("breaks where the silence is long next to the song's usual spacing", () => {
    const display = lines(
      [0, "a"],
      [3, "b"],
      [6, "c"],
      [9, "d"],
      [30, "e"],
      [33, "f"],
      [36, "g"]
    );
    expect(paragraphStarts(display)).toEqual(new Set([0, 4]));
  });

  it("does not break a song of evenly spaced lines", () => {
    const display = lines([0, "a"], [3, "b"], [6, "c"], [9, "d"]);
    expect(paragraphStarts(display)).toEqual(new Set([0]));
  });
});

describe("normLine", () => {
  it("strips punctuation and accents and collapses spaces", () => {
    expect(normLine("Don't \u2014 stop!")).toBe("don t stop");
    expect(normLine("Caf\u00E9  ao   lado")).toBe("cafe ao lado");
  });
});

describe("findVerseTime", () => {
  const display = lines([10, "repeated"], [20, "middle"], [30, "repeated"]);
  const index = buildTimeIndex(display);

  it("indexes every occurrence of a repeated line", () => {
    expect(index.get("repeated")).toEqual([10, 30]);
  });

  it("returns the first occurrence by default", () => {
    expect(findVerseTime(index, "repeated")).toBe(10);
  });

  it("prefers the next occurrence at or after the given time", () => {
    expect(findVerseTime(index, "repeated", 25)).toBe(30);
  });

  it("matches regardless of punctuation and case", () => {
    expect(findVerseTime(index, "Repeated!")).toBe(10);
  });

  it("returns null for a line that is not in the synced lyrics", () => {
    expect(findVerseTime(index, "absent")).toBeNull();
  });
});

describe("nextLineTime", () => {
  const display = lines([10, "a"], [20, "b"], [30, "c"]);

  it("finds the start of the following line", () => {
    expect(nextLineTime(display, 10)).toBe(20);
  });

  it("returns null after the last line", () => {
    expect(nextLineTime(display, 30)).toBeNull();
  });
});

describe("findVerseSpan", () => {
  const display = lines([10, "one"], [20, "two"], [30, "three"], [40, "four"]);
  const index = buildTimeIndex(display);

  it("ends a single-line chunk where the next line begins", () => {
    expect(findVerseSpan(display, index, "two")).toEqual({ start: 20, end: 30 });
  });

  it("uses the real timestamp of the closing line of a paragraph", () => {
    expect(findVerseSpan(display, index, "one\ntwo")).toEqual({ start: 10, end: 30 });
  });

  // When the lyric provider and the LRC word the closing line differently, the
  // end is estimated by counting lines forward instead of giving up.
  it("counts lines forward when the closing line does not match", () => {
    expect(findVerseSpan(display, index, "one\nmismatch\nalso mismatch")).toEqual({
      start: 10,
      end: 40,
    });
  });

  it("returns null when the opening line cannot be located", () => {
    expect(findVerseSpan(display, index, "absent")).toBeNull();
  });

  it("returns null for an empty chunk", () => {
    expect(findVerseSpan(display, index, "   ")).toBeNull();
  });
});
