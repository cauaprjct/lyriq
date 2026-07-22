import { useState } from "react";
import { motion } from "framer-motion";
import { APP } from "../config";
import { NATIVE_LANGS, type Mode, type SongMeta, type TrainerItem } from "../types";
import { fetchSong, translateLines } from "../lib/api";
import { buildItems, isFiller, textToLines } from "../lib/lyrics";
import { DEMO_ITEMS, DEMO_META } from "../data/demo";

type Step = "input" | "review";

interface Props {
  onStart: (items: TrainerItem[], meta: SongMeta, mode: Mode) => void;
}

export function Setup({ onStart }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<SongMeta | null>(null);
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [mode, setMode] = useState<Mode>("translate");
  const [lang, setLang] = useState("pt-BR");

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSearch(searchOverrides?: { artist: string; title: string }) {
    setError("");
    setNotice("");
    setBusy(true);
    setBusyLabel("Buscando a música…");
    try {
      const data = await fetchSong(url, searchOverrides);
      setMeta(data);
      setArtist(data.artist);
      setSong(data.song);
      if (data.found) {
        const clean = data.lines.filter((l) => !isFiller(l));
        setLyricsText((clean.length ? clean : data.lines).join("\n"));
        setNotice("");
      } else {
        setLyricsText("");
        setNotice(data.message || "Letra não encontrada. Ajuste ou cole abaixo.");
      }
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    const lines = textToLines(lyricsText);
    if (lines.length === 0) {
      setError("Cole ou busque a letra antes de começar.");
      return;
    }
    if (!meta) return;
    const finalMeta: SongMeta = { ...meta, artist, song };

    if (mode === "dictation") {
      onStart(buildItems(lines, [], "dictation"), finalMeta, "dictation");
      return;
    }

    setError("");
    setBusy(true);
    setBusyLabel("Traduzindo a letra…");
    try {
      const { translations, partial } = await translateLines(lines, lang);
      if (partial) {
        setNotice(
          "Algumas linhas não foram traduzidas (limite do tradutor). Você pode revisar no treino ou usar o modo ditado."
        );
      }
      onStart(buildItems(lines, translations, "translate"), finalMeta, "translate");
    } catch (e) {
      setError(
        e instanceof Error ? `${e.message} Tente o modo ditado.` : "Falha ao traduzir."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="masthead masthead--home">
        <div className="brand">
          <img className="brand__mark" src="/favicon.svg" alt="" width={40} height={40} />
          <div>
            <h1 className="brand__title">{APP.name}</h1>
            <p className="brand__sub">{APP.tagline}</p>
          </div>
        </div>
      </header>

      {step === "input" ? (
        <div className="card">
          <p className="card__label">Cole o link de uma música no YouTube</p>
          <p className="prompt prompt--home">
            Qual música você quer <em>escrever</em> hoje?
          </p>

          <div className="url-row">
            <input
              className="input input--url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url.trim() && handleSearch()}
              placeholder="https://youtube.com/watch?v=…"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
            <button
              className="btn btn--primary"
              onClick={() => handleSearch()}
              disabled={busy || !url.trim()}
            >
              {busy ? busyLabel : "Buscar"}
            </button>
          </div>

          {error && <p className="alert alert--error">{error}</p>}

          <p className="setup-hint">
            Funciona melhor com músicas em inglês. Você revisa a letra e a tradução antes de
            começar.
          </p>

          <div className="divider">
            <span>ou</span>
          </div>

          <button
            className="btn btn--ghost btn--block"
            onClick={() => onStart(DEMO_ITEMS, DEMO_META, "translate")}
            disabled={busy}
          >
            Experimentar com “Pompeii” — Bastille
          </button>
        </div>
      ) : (
        <div className="card">
          {meta && (
            <div className="review-head">
              <img className="review-art" src={meta.thumbnail} alt="" />
              <div className="review-fields">
                <label className="field">
                  <span>Artista</span>
                  <input
                    className="input input--sm"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Música</span>
                  <input
                    className="input input--sm"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                  />
                </label>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleSearch({ artist, title: song })}
                  disabled={busy}
                >
                  {busy && busyLabel.includes("Busc") ? "Buscando…" : "Rebuscar letra"}
                </button>
              </div>
            </div>
          )}

          {notice && <p className="alert alert--notice">{notice}</p>}

          <label className="card__label" htmlFor="lyrics" style={{ display: "block", marginTop: 4 }}>
            Letra — revise, corte o que não quiser
          </label>
          <textarea
            id="lyrics"
            className="input input--lyrics"
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="Cole a letra aqui, uma linha por verso…"
            spellCheck={false}
          />

          <div className="options">
            <fieldset className="segmented">
              <legend className="sr-only">Modo de treino</legend>
              <label className={mode === "translate" ? "seg seg--on" : "seg"}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "translate"}
                  onChange={() => setMode("translate")}
                />
                Tradução
              </label>
              <label className={mode === "dictation" ? "seg seg--on" : "seg"}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "dictation"}
                  onChange={() => setMode("dictation")}
                />
                Ditado
              </label>
            </fieldset>

            {mode === "translate" && (
              <label className="field field--inline">
                <span>Idioma</span>
                <select className="input input--sm" value={lang} onChange={(e) => setLang(e.target.value)}>
                  {NATIVE_LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <p className="setup-hint">
            {mode === "translate"
              ? "Cada verso vira uma dica na sua língua; você escreve em inglês."
              : "Sem tradução: toque a música, ouça e escreva o verso em inglês."}
          </p>

          {error && <p className="alert alert--error">{error}</p>}

          <div className="controls">
            <button className="btn btn--primary" onClick={handleStart} disabled={busy}>
              {busy ? busyLabel : "Começar treino"}
            </button>
            <button
              className="btn btn--ghost btn--spacer"
              onClick={() => {
                setStep("input");
                setError("");
                setNotice("");
              }}
              disabled={busy}
            >
              ‹ Voltar
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
