import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrainer } from "../hooks/useTrainer";
import { buildHint } from "../lib/diff";
import type { Mode, SongMeta, TrainerItem } from "../types";
import { Feedback } from "../components/Feedback";
import { Results } from "../components/Results";
import { ListenPanel } from "../components/ListenPanel";

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

export function Trainer({ items, meta, mode, onExit }: Props) {
  const t = useTrainer(items);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(mode === "dictation");
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);

  const youtubeUrl = `https://www.youtube.com/watch?v=${meta.videoId}`;
  const graded = t.phase === "graded" && t.result !== null;
  const gradedWrong = graded && !t.result!.isPerfect;

  useEffect(() => {
    if (t.phase === "typing") inputRef.current?.focus();
  }, [t.index, t.phase]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

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
            onClick={() => setListening((v) => !v)}
          >
            <span className="listen-btn__dot" />
            {listening ? "Fechar música" : "Ouvir"}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
            Trocar
          </button>
        </div>
      </header>

      <ListenPanel open={listening} youtubeId={meta.videoId} title={meta.song} />

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
