import { useCallback, useMemo, useState } from "react";
import type { TrainerItem } from "../types";
import { gradeLine, type LineResult } from "../lib/diff";

export type Phase = "typing" | "graded" | "done";

export interface TrainerStats {
  linesCommitted: number;
  perfect: number;
  streak: number;
  bestStreak: number;
  correctWords: number;
  totalWords: number;
  startedAt: number | null;
  finishedAt: number | null;
}

const INITIAL_STATS: TrainerStats = {
  linesCommitted: 0,
  perfect: 0,
  streak: 0,
  bestStreak: 0,
  correctWords: 0,
  totalWords: 0,
  startedAt: null,
  finishedAt: null,
};

export function useTrainer(items: TrainerItem[]) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [result, setResult] = useState<LineResult | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<TrainerStats>(INITIAL_STATS);

  const total = items.length;
  const current = items[Math.min(index, total - 1)];

  const commit = useCallback(
    (r: LineResult | null, credited: boolean) => {
      setStats((s) => {
        const perfect = r?.isPerfect ? 1 : 0;
        const streak = credited && r?.isPerfect ? s.streak + 1 : 0;
        return {
          linesCommitted: s.linesCommitted + 1,
          perfect: s.perfect + perfect,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          correctWords: s.correctWords + (r?.correctWords ?? 0),
          totalWords:
            s.totalWords + (r?.totalWords ?? current.answer.trim().split(/\s+/).length),
          startedAt: s.startedAt ?? Date.now(),
          finishedAt: s.finishedAt,
        };
      });
    },
    [current]
  );

  const advance = useCallback(() => {
    setResult(null);
    setHintLevel(0);
    setRevealed(false);
    setIndex((i) => {
      const nextIndex = i + 1;
      if (nextIndex >= total) {
        setPhase("done");
        setStats((s) => ({ ...s, finishedAt: Date.now() }));
        return i;
      }
      setPhase("typing");
      return nextIndex;
    });
  }, [total]);

  const check = useCallback(
    (typed: string): boolean => {
      if (!typed.trim()) return false;
      const r = gradeLine(current.answer, typed);
      setResult(r);
      setPhase("graded");
      if (r.isPerfect) commit(r, true);
      return r.isPerfect;
    },
    [current, commit]
  );

  const moveOn = useCallback(() => {
    if (phase === "graded" && result && !result.isPerfect) {
      commit(result, false);
    } else if (phase === "typing") {
      commit(null, false);
    }
    advance();
  }, [phase, result, commit, advance]);

  const skip = useCallback(() => {
    commit(revealed || result ? result : null, false);
    advance();
  }, [commit, revealed, result, advance]);

  const hint = useCallback(() => setHintLevel((l) => Math.min(l + 1, 2)), []);
  const reveal = useCallback(() => setRevealed(true), []);

  const restart = useCallback(() => {
    setIndex(0);
    setPhase("typing");
    setResult(null);
    setHintLevel(0);
    setRevealed(false);
    setStats(INITIAL_STATS);
  }, []);

  const accuracy = useMemo(() => {
    if (stats.totalWords === 0) return 0;
    return Math.round((stats.correctWords / stats.totalWords) * 100);
  }, [stats.correctWords, stats.totalWords]);

  return {
    index,
    total,
    current,
    phase,
    result,
    hintLevel,
    revealed,
    stats,
    accuracy,
    check,
    advance,
    moveOn,
    skip,
    hint,
    reveal,
    restart,
  };
}
