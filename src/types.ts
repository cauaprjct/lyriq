export type Mode = "translate" | "dictation";

/** How much of the song the learner types at once. */
export type Chunk = "line" | "block";

/** Who sets the tempo: the learner, or the song itself. */
export type Pace = "self" | "song";

export interface Prefs {
  chunk: Chunk;
  pace: Pace;
}

export interface TrainerItem {
  /** The line the learner must type (original lyric, e.g. English). */
  answer: string;
  /** What is shown as the prompt (translation, or a dictation hint). */
  prompt: string;
  section?: string;
}

export interface SongMeta {
  videoId: string;
  videoTitle: string;
  author: string;
  artist: string;
  song: string;
  thumbnail: string;
}

export interface SongResponse extends SongMeta {
  found: boolean;
  lines: string[];
  message?: string;
  error?: string;
}

export interface TranslateResponse {
  translations: string[];
  partial: boolean;
  error?: string;
}

export interface SyncedResponse {
  hasSync: boolean;
  syncedLyrics: string;
  plainLyrics: string;
  artist: string;
  title: string;
  error?: string;
}

export interface NativeLang {
  code: string;
  label: string;
}

export const NATIVE_LANGS: NativeLang[] = [
  { code: "pt-BR", label: "Português" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
];

export type Level = "iniciante" | "intermediario" | "avancado";

export interface LevelInfo {
  label: string;
  /** Short hint shown near the level filter. */
  blurb: string;
  order: number;
}

export const LEVELS: Record<Level, LevelInfo> = {
  iniciante: {
    label: "Iniciante",
    blurb: "Ritmo calmo, vocabulário do dia a dia, versos que se repetem.",
    order: 0,
  },
  intermediario: {
    label: "Intermediário",
    blurb: "Frases mais longas e expressões comuns do inglês falado.",
    order: 1,
  },
  avancado: {
    label: "Avançado",
    blurb: "Rápido e denso, com gírias e imagens menos literais.",
    order: 2,
  },
};

export interface CatalogSong {
  /** Stable key used for progress storage — the YouTube video id. */
  videoId: string;
  artist: string;
  song: string;
  level: Level;
  year?: number;
}
