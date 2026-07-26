import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { APP } from "../config";
import {
  LEVELS,
  NATIVE_LANGS,
  type CatalogSong,
  type Level,
  type Chunk,
  type Mode,
  type Pace,
  type Prefs,
  type SongMeta,
  type TrainerItem,
} from "../types";
import { fetchSong, translateLines } from "../lib/api";
import { buildItems, flattenBlocks, stripFiller, textToBlocks } from "../lib/lyrics";
import { loadPrefs, savePrefs } from "../lib/prefs";
import { CATALOG, thumbFor, watchUrl } from "../data/catalog";
import { loadProgress, summarize } from "../lib/progress";
import { DEMO_ITEMS, DEMO_META } from "../data/demo";

type Step = "input" | "review";
type Filter = Level | "todos";

interface Props {
  onStart: (items: TrainerItem[], meta: SongMeta, mode: Mode, prefs: Prefs) => void;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "iniciante", label: "Iniciante" },
  { key: "intermediario", label: "Intermediário" },
  { key: "avancado", label: "Avançado" },
];

export function Setup({ onStart }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<SongMeta | null>(null);
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [mode, setMode] = useState<Mode>("translate");
  const [lang, setLang] = useState("pt-BR");
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [filter, setFilter] = useState<Filter>("todos");

  // Local progress (browser-only). Read once; used to badge catalog cards.
  const progress = useMemo(() => loadProgress(), []);
  const summary = useMemo(() => summarize(progress), [progress]);

  const shownSongs = useMemo(
    () => (filter === "todos" ? CATALOG : CATALOG.filter((s) => s.level === filter)),
    [filter]
  );

  // Preview of how the lyrics will be split, so the choice isn't abstract.
  const blocks = useMemo(() => textToBlocks(lyricsText), [lyricsText]);
  const lineCount = useMemo(() => flattenBlocks(blocks).length, [blocks]);

  function updatePrefs(patch: Partial<Prefs>) {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  }

  async function handleSearch(opts?: {
    urlArg?: string;
    overrides?: { artist: string; title: string };
  }) {
    const target = opts?.urlArg ?? url;
    if (!target.trim()) return;
    setError("");
    setNotice("");
    setBusy(true);
    setBusyLabel("Buscando a música…");
    try {
      const data = await fetchSong(target, opts?.overrides);
      setMeta(data);
      setArtist(data.artist);
      setSong(data.song);
      if (data.found) {
        const clean = stripFiller(data.lines);
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
      setPickingId(null);
    }
  }

  function handlePick(s: CatalogSong) {
    setPickingId(s.videoId);
    const link = watchUrl(s.videoId);
    setUrl(link);
    void handleSearch({ urlArg: link, overrides: { artist: s.artist, title: s.song } });
  }

  async function handleStart() {
    const lines = flattenBlocks(blocks);
    if (lines.length === 0) {
      setError("Cole ou busque a letra antes de começar.");
      return;
    }
    if (!meta) return;
    const finalMeta: SongMeta = { ...meta, artist, song };

    if (mode === "dictation") {
      onStart(buildItems(blocks, [], "dictation", prefs.chunk), finalMeta, "dictation", prefs);
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
      onStart(
        buildItems(blocks, translations, "translate", prefs.chunk),
        finalMeta,
        "translate",
        prefs
      );
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
        <div className="home">
          <section className="catalog" aria-labelledby="catalog-title">
            <div className="section-head">
              <h2 id="catalog-title" className="section-title">
                Comece por uma música
              </h2>
              <p className="section-sub">
                {summary.songsPracticed > 0
                  ? `Você já treinou ${summary.songsPracticed} ${
                      summary.songsPracticed === 1 ? "música" : "músicas"
                    }. Continue de onde parou ou tente uma nova.`
                  : "Escolhas com letra clara pra escrever ouvindo. Toque numa e revise antes de começar."}
              </p>
            </div>

            <div className="filter" role="group" aria-label="Filtrar por nível">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={filter === f.key ? "filter__chip filter__chip--on" : "filter__chip"}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  disabled={busy}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ul className="song-grid">
              {shownSongs.map((s) => {
                const best = progress[s.videoId]?.bestAccuracy;
                const loading = pickingId === s.videoId;
                return (
                  <li key={s.videoId}>
                    <button
                      type="button"
                      className="songcard"
                      onClick={() => handlePick(s)}
                      disabled={busy}
                      aria-busy={loading}
                    >
                      <span className="songcard__cover">
                        <img
                          className="songcard__art"
                          src={thumbFor(s.videoId)}
                          alt=""
                          loading="lazy"
                          width={480}
                          height={360}
                        />
                        <span className={`badge badge--${s.level}`}>
                          {LEVELS[s.level].label}
                        </span>
                        {loading && <span className="songcard__loading">Abrindo…</span>}
                      </span>
                      <span className="songcard__body">
                        <span className="songcard__song">{s.song}</span>
                        <span className="songcard__artist">
                          {s.artist}
                          {s.year ? ` · ${s.year}` : ""}
                        </span>
                      </span>
                      {typeof best === "number" && (
                        <span className="songcard__best" title="Sua melhor precisão">
                          Melhor {best}%
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="paste">
            <div className="divider">
              <span>ou cole um link do YouTube</span>
            </div>

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
                {busy && pickingId === null ? busyLabel : "Buscar"}
              </button>
            </div>

            {error && <p className="alert alert--error">{error}</p>}

            <p className="setup-hint">
              Funciona melhor com músicas em inglês. Você revisa a letra e a tradução antes de
              começar — nada fica salvo.{" "}
              <button
                type="button"
                className="linklike"
                onClick={() => onStart(DEMO_ITEMS, DEMO_META, "translate", { ...prefs, chunk: "line" })}
                disabled={busy}
              >
                Ver uma demonstração
              </button>
            </p>
          </div>
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
                  onClick={() => handleSearch({ overrides: { artist, title: song } })}
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

          <div className="prefs">
            <div className="prefs__row">
              <div className="prefs__label">
                <span className="prefs__title">Tamanho do trecho</span>
                <span className="prefs__note">
                  {prefs.chunk === "line"
                    ? `Um verso por vez — ${lineCount} no total.`
                    : `Um parágrafo por vez — ${blocks.length} ${
                        blocks.length === 1 ? "trecho" : "trechos"
                      }.`}
                </span>
              </div>
              <fieldset className="segmented segmented--sm">
                <legend className="sr-only">Tamanho do trecho</legend>
                {(
                  [
                    { key: "line", label: "Frase" },
                    { key: "block", label: "Parágrafo" },
                  ] as { key: Chunk; label: string }[]
                ).map((o) => (
                  <label key={o.key} className={prefs.chunk === o.key ? "seg seg--on" : "seg"}>
                    <input
                      type="radio"
                      name="chunk"
                      checked={prefs.chunk === o.key}
                      onChange={() => updatePrefs({ chunk: o.key })}
                    />
                    {o.label}
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="prefs__row">
              <div className="prefs__label">
                <span className="prefs__title">Ritmo</span>
                <span className="prefs__note">
                  {prefs.pace === "self"
                    ? "Você decide quando ouvir e quando escrever."
                    : "A música toca o trecho e para, esperando você escrever."}
                </span>
              </div>
              <fieldset className="segmented segmented--sm">
                <legend className="sr-only">Ritmo do treino</legend>
                {(
                  [
                    { key: "self", label: "Meu ritmo" },
                    { key: "song", label: "Acompanhar a música" },
                  ] as { key: Pace; label: string }[]
                ).map((o) => (
                  <label key={o.key} className={prefs.pace === o.key ? "seg seg--on" : "seg"}>
                    <input
                      type="radio"
                      name="pace"
                      checked={prefs.pace === o.key}
                      onChange={() => updatePrefs({ pace: o.key })}
                    />
                    {o.label}
                  </label>
                ))}
              </fieldset>
            </div>
          </div>

          <p className="setup-hint">
            {mode === "translate"
              ? "Cada trecho vira uma dica na sua língua; você escreve em inglês."
              : "Sem tradução: toque a música, ouça e escreva em inglês."}
            {prefs.pace === "song" && " Precisa de letra sincronizada — se a música não tiver, o treino segue no seu ritmo."}
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
