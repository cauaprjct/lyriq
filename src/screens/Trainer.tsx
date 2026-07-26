import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrainer } from "../hooks/useTrainer";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { buildHint } from "../lib/diff";
import { fetchSynced } from "../lib/api";
import {
  buildTimeIndex,
  displayLines,
  findVerseSpan,
  paragraphStarts,
  parseLrc,
  type SyncedLine,
} from "../lib/lrc";
import type { Mode, Pace, Prefs, SongMeta, TrainerItem } from "../types";
import { savePrefs } from "../lib/prefs";
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
  prefs: Prefs;
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

export function Trainer({ items, meta, mode, prefs, onExit }: Props) {
  const t = useTrainer(items);
  const isBlock = prefs.chunk === "block";
  const [pace, setPace] = useState<Pace>(prefs.pace);
  const wantsFollow = pace === "song";

  const [text, setText] = useState("");
  const [listening, setListening] = useState(mode === "dictation" || wantsFollow);
  const [mediaMounted, setMediaMounted] = useState(mode === "dictation" || wantsFollow);
  const [locked, setLocked] = useState(false);
  const [record, setRecord] = useState<RecordResult | null>(null);

  const [sync, setSync] = useState<SyncState>(EMPTY_SYNC);
  const [syncLoading, setSyncLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  /** LRC time where playback should stop (set when we play a single chunk). */
  const pauseAtRef = useRef<number | null>(null);
  /** Chunk index we already auto-played, so we don't restart it on re-renders. */
  const autoPlayedRef = useRef<number | null>(null);

  const { containerRef, ready, controller } = useYouTubePlayer(meta.videoId, mediaMounted);

  const youtubeUrl = `https://www.youtube.com/watch?v=${meta.videoId}`;
  const graded = t.phase === "graded" && t.result !== null;
  const gradedWrong = graded && !t.result!.isPerfect;

  /** How many lines this chunk has — sizes the textarea in paragraph mode. */
  const answerLines = t.current.answer.split("\n").length;
  const currentSpan = sync.hasSync
    ? findVerseSpan(sync.lines, sync.index, t.current.answer)
    : null;
  /** "Follow the song" only makes sense once we have timestamps for it. */
  const following = wantsFollow && sync.hasSync;
  const followUnavailable = wantsFollow && !sync.hasSync && !syncLoading;

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

  // Stop playback at the end of the chunk we asked for. Runs off the player's
  // ticker (not React state) so typing never re-renders on every frame.
  useEffect(() => {
    if (!mediaMounted) return;
    return controller.subscribe((playbackT) => {
      const stopAt = pauseAtRef.current;
      if (stopAt == null) return;
      if (playbackT + offset >= stopAt - 0.08) {
        pauseAtRef.current = null;
        controller.pause();
      }
    });
  }, [mediaMounted, controller, offset]);

  // "Follow the song": each new chunk plays itself, then waits for the typing.
  useEffect(() => {
    if (!following || t.phase !== "typing") return;
    if (autoPlayedRef.current === t.index) return;
    const from = (ready ? controller.getTime() : 0) + offset;
    const span = findVerseSpan(sync.lines, sync.index, t.current.answer, from - 1.5);
    if (!span) return;
    autoPlayedRef.current = t.index;
    pauseAtRef.current = span.end;
    setMediaMounted(true);
    setListening(true);
    seekToTime(span.start);
    // A seek issued right after a programmatic pause is sometimes swallowed
    // while the player settles, so nudge play once more shortly after.
    const retry = window.setTimeout(() => controller.play(), 400);
    return () => window.clearTimeout(retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following, t.index, t.phase, sync, ready]);

  function toggleListen() {
    if (listening) {
      pauseAtRef.current = null;
      controller.pause();
      setListening(false);
    } else {
      // Opening the player by hand means "just play" — no auto-stop.
      pauseAtRef.current = null;
      setMediaMounted(true);
      setListening(true);
    }
  }

  function togglePace() {
    const next: Pace = pace === "song" ? "self" : "song";
    setPace(next);
    savePrefs({ ...prefs, pace: next });
    if (next === "self") {
      pauseAtRef.current = null;
    } else {
      // Let the current chunk play itself right away.
      autoPlayedRef.current = null;
    }
  }

  function playCurrentVerse() {
    const from = (ready ? controller.getTime() : 0) + offset;
    const span = findVerseSpan(sync.lines, sync.index, t.current.answer, from - 1.5);
    if (!span) return;
    pauseAtRef.current = span.end;
    setMediaMounted(true);
    setListening(true);
    seekToTime(span.start);
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
    autoPlayedRef.current = null;
    pauseAtRef.current = null;
    t.restart();
    goNextLine();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    // Typing a whole paragraph needs Enter for line breaks, so submitting
    // moves to Ctrl/Cmd+Enter. One line per chunk keeps plain Enter.
    const submit = isBlock ? e.ctrlKey || e.metaKey : !e.shiftKey;
    if (!submit) return;
    e.preventDefault();
    if (gradedWrong && text.trim() === "") handleMoveOn();
    else handleCheck();
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
          {sync.hasSync && (
            <button
              type="button"
              className={pace === "song" ? "pace-btn pace-btn--on" : "pace-btn"}
              aria-pressed={pace === "song"}
              onClick={togglePace}
              title={
                pace === "song"
                  ? "A música toca cada trecho e para. Toque para voltar ao seu ritmo."
                  : "Deixar a música tocar cada trecho e parar para você escrever."
              }
            >
              {pace === "song" ? "Seguindo a música" : "Meu ritmo"}
            </button>
          )}
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
                {isBlock ? "Trecho" : "Verso"} <strong>{t.index + 1}</strong>/{t.total}
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
                {mode === "dictation"
                  ? isBlock
                    ? "Ouça e escreva o parágrafo em inglês"
                    : "Ouça e escreva em inglês"
                  : isBlock
                    ? "Escreva o parágrafo em inglês"
                    : "Escreva em inglês"}
              </p>
              <p
                className={`prompt ${mode === "dictation" ? "prompt--dictation" : ""} ${
                  isBlock ? "prompt--block" : ""
                }`}
              >
                {t.current.prompt}
              </p>

              <p className="hint" aria-live="polite">
                {t.hintLevel > 0 ? buildHint(t.current.answer, t.hintLevel) : "\u00A0"}
              </p>

              {currentSpan && (
                <button type="button" className="verse-listen" onClick={playCurrentVerse}>
                  <span className="verse-listen__icon" aria-hidden="true">▶</span>
                  {following
                    ? isBlock
                      ? "Tocar o trecho de novo"
                      : "Tocar o verso de novo"
                    : isBlock
                      ? "Ouvir este trecho"
                      : "Ouvir este verso"}
                </button>
              )}

              {followUnavailable && (
                <p className="alert alert--notice alert--tight">
                  Essa música não tem letra sincronizada, então o treino segue no seu ritmo.
                </p>
              )}

              <label className="sr-only" htmlFor="answer">
                Verso em inglês
              </label>
              <textarea
                id="answer"
                ref={inputRef}
                className="input"
                rows={isBlock ? Math.min(8, Math.max(3, answerLines)) : 2}
                value={text}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  isBlock
                    ? "escreva o trecho, uma linha por verso — Ctrl+Enter confere…"
                    : "digite em inglês e aperte Enter…"
                }
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
                      {isBlock ? "Próximo trecho ›" : "Próximo verso ›"}
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
