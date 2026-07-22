export type Mode = "translate" | "dictation";

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
