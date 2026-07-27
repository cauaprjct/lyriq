import { motion } from "framer-motion";
import type { LineResult, ResultToken } from "../lib/diff";

const CheckIcon = () => (
  <svg className="status__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6.5 9.5 17 4 11.5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AlmostIcon = () => (
  <svg className="status__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
    <path d="M12 7v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1.3" fill="currentColor" />
  </svg>
);

interface Props {
  result: LineResult;
  expected: string;
}

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * What a token means, in words. Colour alone never carries the distinction, so
 * this text is both the pointer tooltip and what a screen reader announces.
 */
function describe(t: ResultToken): string | undefined {
  switch (t.status) {
    case "correct":
      return undefined;
    case "wrong":
      return `voc\u00EA escreveu ${t.typed}, o certo \u00E9 ${t.expected}`;
    case "missing":
      return `faltou ${t.expected}`;
    case "extra":
      return `sobrou ${t.typed}`;
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One-line shape of the result, so the announcement leads with the summary. */
function summarize(tokens: ResultToken[]): string {
  const count = (s: ResultToken["status"]) => tokens.filter((t) => t.status === s).length;
  const parts = [
    [count("correct"), "certa", "certas"],
    [count("wrong"), "errada", "erradas"],
    [count("missing"), "faltando", "faltando"],
    [count("extra"), "sobrando", "sobrando"],
  ] as const;

  return parts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => plural(n, one, many))
    .join(", ");
}

export function Feedback({ result, expected }: Props) {
  const { tokens, isPerfect } = result;

  return (
    <div className="feedback" aria-live="polite">
      <p className={`status ${isPerfect ? "status--ok" : "status--wrong"}`}>
        {isPerfect ? <CheckIcon /> : <AlmostIcon />}
        {isPerfect
          ? "Perfeito \u2014 verso completo."
          : "Quase l\u00E1. Veja as palavras abaixo."}
      </p>

      {!isPerfect && <p className="sr-only">{summarize(tokens)}.</p>}

      <div className="words">
        {tokens.map((t, i) => {
          const label = describe(t);
          return (
            <motion.span
              key={i}
              className={`word word--${t.status}`}
              title={label}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.02, duration: 0.24 }}
            >
              {label ? (
                // The marks are visual shorthand; hide them and say it plainly.
                <span aria-hidden="true">{t.status === "extra" ? t.typed : t.expected}</span>
              ) : (
                t.expected
              )}
              {t.status === "wrong" && (
                <span className="word__typed" aria-hidden="true">
                  {t.typed}
                </span>
              )}
              {label && <span className="sr-only">{label}</span>}
            </motion.span>
          );
        })}
      </div>

      {!isPerfect && (
        <p className="answer-line">
          Resposta certa: <b>{expected}</b>
        </p>
      )}
    </div>
  );
}
