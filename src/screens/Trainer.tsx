import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrainer } from "../hooks/useTrainer";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { buildHint } from "../lib/diff";
import { fetchSynced } from "../lib/api";
import {
  buildTimeIndex,
  displayLines,
  findVerseTime,
  paragraphStarts,
  parseLrc,
  type SyncedLine,
} from "../lib/lrc";
import type { Mode, SongMeta, TrainerItem } from "../types";
import { Feedback } from "../components/Feedback";
import { Results } from "../components/Results";
import { MediaPanel } from "../components/MediaPanel";
import { recordSession, type RecordResult } from "../lib/progress";

const PERFECT_DELAY = 850;

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  items: TrainerItem[];
  meta: SongMeta;
  mode: Mode;
  onExit: () => void;
}

interface SyncState {
  hasSync: boolean;
  lines: SyncedLine[];
  paraStarts: Set<number>;
  index: Map<string, number[]>;
}

const EMPTY_SYNC: SyncState = {
  hasSync: false,
  lines: [],
  paraStarts: new Set(),
  index: new Map(),
};

export function Trainer({ items, meta, mode, onExit }: Props) {
  const t = useTrainer(items);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(mode === "dictation");
  const [mediaMounted, setMediaMounted] = useState(mode === "dictation");
  const [locked, setLocked] = useState(false);
  const [record, setRecord] = useState<RecordResult | null>(null);

  const [sync, setSync] = useState<SyncState>(EMPTY_SYNC);
  const [syncLoading, setSyncLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const pendingSeek = useRef<number | null>(null);

  const { containerRef, ready, controller } = useYouTubePlayer(meta.videoId, mediaMounted);

  const youtubeUrl = `https://www.youtube.com/watch?v=${meta.videoId}`;
  const graded = t.phase === "graded" && t.result !== null;
  const gradedWrong = graded && !t.result!.isPerfect;

  const currentVerseTime = sync.hasSync ? findVerseTime(sync.index, t.current.answer) : null;

  useEffect(() => {
    if (t.phase === "typing") inputRef.current?.focus();
  }, [t.index, t.phase]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  // Persist the result once per finished run (browser-only progress).
  useEffect(() => {
    if (t.phase === "done") {
      if (!recordedRef.current) {
        recordedRef.current = true;
        setRecord(
          recordSession({
            videoId: meta.videoId,
            artist: meta.artist,
            song: meta.song,
            accuracy: t.accuracy,
            streak: t.stats.bestStreak,
          })
        );
      }
    } else {
      recordedRef.current = false;
      if (record) setRecord(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.phase]);

  // Fetch time-synced lyrics for the karaoke panel (graceful if unavailable).
  useEffect(() => {
    let cancel = false;
    setSyncLoading(true);
    fetchSynced(meta.artist, meta.song)
      .then((res) => {
        if (cancel) return;
        if (res.hasSync && res.syncedLyrics) {
          const disp = displayLines(parseLrc(res.syncedLyrics));
          setSync(
            disp.length
              ? {
                  hasSync: true,
                  lines: disp,
                  paraStarts: paragraphStarts(disp),
                  index: buildTimeIndex(disp),
                }
              : EMPTY_SYNC
          );
        } else {
          setSync(EMPTY_SYNC);
        }
      })
      .catch(() => !cancel && setSync(EMPTY_SYNC))
      .finally(() => !cancel && setSyncLoading(false));
    return () => {
      cancel = true;
    };
  }, [meta.artist, meta.song]);

  // Flush a seek requested before the player finished loading.
  useEffect(() => {
    if (ready && pendingSeek.current != null) {
      controller.seekTo(pendingSeek.current, true);
      pendingSeek.current = null;
    }
  }, [ready, controller]);

  function seekToTime(lrcTime: number) {
    const target = Math.max(0, lrcTime - offset);
    if (ready) controller.seekTo(target, true);
    else pendingSeek.current = target;
  }

  function toggleListen() {
    if (listening) {
      controller.pause();
      setListening(false);
    } else {
      setMediaMounted(true);
      setListening(true);
    }
  }

  function playCurrentVerse() {
    const from = (ready ? controller.getTime() : 0) + offset;
    const time = findVerseTime(sync.index, t.current.answer, from - 1.5);
    if (time == null) return;
    setMediaMounted(true);
    setListening(true);
    seekToTime(time);
    inputRef.current?.focus();
  }

  function nudgeOffset(delta: number) {
    setOffset((o) => Math.max(-15, Math.min(15, Math.round((o + delta) * 10) / 10)));
  }

  function goNextLine() {
    setText("");
    setLocked(false);
  }

  function handleCheck() {
    if (locked || t.phase === "done") return;
    const perfect = t.check(text);
    if (perfect) {
      setLocked(true);
      timerRef.current = window.setTimeout(
        () => {
          t.advance();
          goNextLine();
        },
        prefersReduced ? 400 : PERFECT_DELAY
      );
    }
  }

  function handleMoveOn() {
    t.moveOn();
    goNextLine();
  }

  function handleSkip() {
    t.skip();
    goNextLine();
  }

  function handleReveal() {
    t.reveal();
    if (!text.trim()) setText(t.current.answer);
    inputRef.current?.focus();
  }

  function handleRestart() {
    t.restart();
    goNextLine();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (gradedWrong && text.trim() === "") handleMoveOn();
      else handleCheck();
    }
  }

  const progressPct = t.phase === "done" ? 100 : (t.index / t.total) * 100;

  return (
    <>
      <header className="masthead">
        <button type="button" className="songchip" onClick={onExit} title="Trocar de música">
          <img className="songchip__art" src={meta.thumbnail} alt="" width={44} height={44} />
          <span className="songchip__text">
            <span className="songchip__title">{meta.song}</span>
            <span className="songchip__artist">{meta.artist}</span>
          </span>
        </button>

        <div className="masthead__actions">
          <button
            type="button"
            className="listen-btn"
            aria-pressed={listening}
            onClick={toggleListen}
          >
            <span className="listen-btn__dot" />
            {listening ? "Fechar música" : "Ouvir"}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
            Trocar
          </button>
        </div>
      </header>

      {mediaMounted && (
        <MediaPanel
          visible={listening}
          containerRef={containerRef}
          controller={controller}
          loadingSync={syncLoading}
          hasSync={sync.hasSync}
          lines={sync.lines}
          paraStarts={sync.paraStarts}
          offset={offset}
          onOffset={nudgeOffset}
          onSeekLine={seekToTime}
        />
      )}

      {t.phase !== "done" && (
        <div className="progress">
          <div
            className="progress__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={t.total}
            aria-valuenow={t.index}
            aria-label="Progresso da música"
          >
            <motion.div
              className="progress__fill"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="progress__meta">
            <span className="progress__section">{t.current.section ?? "Letra"}</span>
            <span className="chips">
              <span className="chip">
                Verso <strong>{t.index + 1}</strong>/{t.total}
              </span>
              <span className="chip">
                Sequência <strong>{t.stats.streak}</strong>
              </span>
            </span>
          </div>
        </div>
      )}

      {t.phase === "done" ? (
        <div className="card">
          <Results
            stats={t.stats}
            accuracy={t.accuracy}
            total={t.total}
            onRestart={handleRestart}
            youtubeUrl={youtubeUrl}
            record={record}
          />
        </div>
      ) : (
        <div className="card">
          <AnimatePresence mode="wait">
            <motion.div
              key={t.index}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="card__label">
                {mode === "dictation" ? "Ouça e escreva em inglês" : "Escreva em inglês"}
              </p>
              <p className={`prompt ${mode === "dictation" ? "prompt--dictation" : ""}`}>
                {t.current.prompt}
              </p>

              <p className="hint" aria-live="polite">
                {t.hintLevel > 0 ? buildHint(t.current.answer, t.hintLevel) : "\u00A0"}
              </p>

              {currentVerseTime != null && (
                <button type="button" className="verse-listen" onClick={playCurrentVerse}>
                  <span className="verse-listen__icon" aria-hidden="true">▶</span>
                  Ouvir este verso
                </button>
              )}

              <label className="sr-only" htmlFor="answer">
                Verso em inglês
              </label>
              <textarea
                id="answer"
                ref={inputRef}
                className="input"
                rows={2}
                value={text}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="digite em inglês e aperte Enter…"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />

              <div className="controls">
                {gradedWrong ? (
                  <>
                    <button className="btn btn--primary" onClick={handleCheck}>
                      Conferir de novo
                    </button>
                    <button className="btn btn--ghost" onClick={handleReveal}>
                      Ver resposta
                    </button>
                    <button className="btn btn--ghost btn--spacer" onClick={handleMoveOn}>
                      Próximo verso ›
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn--primary" onClick={handleCheck} disabled={locked}>
                      Conferir
                    </button>
                    <button
                      className="btn btn--ghost"
                      onClick={t.hint}
                      disabled={locked || t.hintLevel >= 2}
                    >
                      Dica
                    </button>
                    <button className="btn btn--ghost" onClick={handleReveal} disabled={locked}>
                      Ver resposta
                    </button>
                    <button
                      className="btn btn--ghost btn--spacer"
                      onClick={handleSkip}
                      disabled={locked}
                    >
                      Pular ›
                    </button>
                  </>
                )}
              </div>

              {t.revealed && !graded && (
                <p className="answer-line">
                  Resposta: <b>{t.current.answer}</b>
                </p>
              )}

              {graded && <Feedback result={t.result!} expected={t.current.answer} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
