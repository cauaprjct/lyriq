import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, loadPrefs, savePrefs } from "./prefs";

const KEY = "lyriq.prefs.v1";

/** Minimal in-memory stand-in for localStorage, so these stay unit tests. */
function fakeStorage(seed?: string) {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set(KEY, seed);
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

function use(storage: unknown) {
  vi.stubGlobal("localStorage", storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadPrefs", () => {
  it("returns the defaults when nothing was stored", () => {
    use(fakeStorage());
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("restores a full set of stored preferences", () => {
    use(fakeStorage(JSON.stringify({ mode: "dictation", chunk: "block", pace: "song" })));
    expect(loadPrefs()).toEqual({ mode: "dictation", chunk: "block", pace: "song" });
  });

  // Preferences saved before `mode` existed live under this same key, so a
  // returning browser must keep its chunk and pace and just default the mode.
  // Bumping the key would have thrown those choices away instead.
  it("carries over preferences saved before the mode field existed", () => {
    use(fakeStorage(JSON.stringify({ chunk: "block", pace: "song" })));
    expect(loadPrefs()).toEqual({ mode: "translate", chunk: "block", pace: "song" });
  });

  it("falls back per field, keeping the values that are valid", () => {
    use(fakeStorage(JSON.stringify({ mode: "nonsense", chunk: "block", pace: "nope" })));
    expect(loadPrefs()).toEqual({ mode: "translate", chunk: "block", pace: "self" });
  });

  it("ignores a hand-edited value that is not an object", () => {
    use(fakeStorage('"just a string"'));
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("survives malformed JSON", () => {
    use(fakeStorage("{not json"));
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("survives storage that refuses to be read, as in private mode", () => {
    use({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    });
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("survives having no storage at all", () => {
    use(undefined);
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
});

describe("savePrefs", () => {
  it("writes under the documented key and reads back identically", () => {
    const storage = fakeStorage();
    use(storage);
    const prefs = { mode: "dictation", chunk: "block", pace: "song" } as const;
    savePrefs(prefs);
    expect(storage.store.has(KEY)).toBe(true);
    expect(loadPrefs()).toEqual(prefs);
  });

  it("stays quiet when storage is full or blocked", () => {
    use({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });
    expect(() => savePrefs(DEFAULT_PREFS)).not.toThrow();
  });

  it("stays quiet when there is no storage at all", () => {
    use(undefined);
    expect(() => savePrefs(DEFAULT_PREFS)).not.toThrow();
  });
});
