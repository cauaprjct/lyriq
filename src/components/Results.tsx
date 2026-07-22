import type { TrainerStats } from "../hooks/useTrainer";

interface Props {
  stats: TrainerStats;
  accuracy: number;
  total: number;
  onRestart: () => void;
  youtubeUrl: string;
}

function formatDuration(start: number | null, end: number | null): string {
  if (!start || !end) return "\u2014";
  const secs = Math.max(0, Math.round((end - start) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function verdict(accuracy: number): string {
  if (accuracy >= 95) return "Voc\u00EA praticamente canta essa em ingl\u00EAs.";
  if (accuracy >= 80) return "Muito bom \u2014 s\u00F3 alguns versos pra lapidar.";
  if (accuracy >= 55) return "Tá pegando o jeito. Roda de novo pra fixar.";
  return "Bom come\u00E7o. A repeti\u00E7\u00E3o \u00E9 que ensina.";
}

export function Results({ stats, accuracy, total, onRestart, youtubeUrl }: Props) {
  return (
    <section className="results" aria-labelledby="results-title">
      <p className="results__kicker">Fim da música</p>
      <h2 id="results-title" className="results__title">
        {verdict(accuracy)}
      </h2>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__value stat__value--accent">{accuracy}%</div>
          <div className="stat__label">Precisão nas palavras</div>
        </div>
        <div className="stat">
          <div className="stat__value stat__value--ok">
            {stats.perfect}
            <span style={{ color: "var(--faint)", fontSize: "1.1rem" }}>/{total}</span>
          </div>
          <div className="stat__label">Versos perfeitos</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats.bestStreak}</div>
          <div className="stat__label">Melhor sequência</div>
        </div>
        <div className="stat">
          <div className="stat__value">
            {formatDuration(stats.startedAt, stats.finishedAt)}
          </div>
          <div className="stat__label">Tempo</div>
        </div>
      </div>

      <div className="results__actions">
        <button className="btn btn--primary" onClick={onRestart} autoFocus>
          Treinar de novo
        </button>
        <a className="btn btn--ghost" href={youtubeUrl} target="_blank" rel="noreferrer">
          Ouvir no YouTube
        </a>
      </div>
    </section>
  );
}
