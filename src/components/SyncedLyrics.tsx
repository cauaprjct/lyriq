import { useEffect, useRef, useState } from "react";
import type { PlayerController } from "../hooks/useYouTubePlayer";
import { activeLineIndex, type SyncedLine } from "../lib/lrc";

interface Props {
  lines: SyncedLine[];
  paraStarts: Set<number>;
  controller: PlayerController;
  /** Seconds added to playback time before matching (drift correction). */
  offset: number;
  /** Click a line: parent seeks (applying offset). */
  onSeekLine: (lineTime: number) => void;
}

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SyncedLyrics({ lines, paraStarts, controller, offset, onSeekLine }: Props) {
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Follow playback without re-rendering the trainer: only update on change.
  useEffect(() => {
    const unsub = controller.subscribe((t) => {
      const idx = activeLineIndex(lines, t + offset);
      setActive((prev) => (prev === idx ? prev : idx));
    });
    return unsub;
  }, [controller, lines, offset]);

  // Keep the current line in view inside the scroll box.
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    el.scrollIntoView({
      block: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <div className="synced" ref={listRef} aria-label="Letra sincronizada">
      {lines.map((line, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            type="button"
            ref={isActive ? activeRef : undefined}
            className={
              "synced__line" +
              (isActive ? " synced__line--on" : "") +
              (i < active ? " synced__line--past" : "") +
              (i > 0 && paraStarts.has(i) ? " synced__line--para" : "")
            }
            aria-current={isActive ? "true" : undefined}
            onClick={() => onSeekLine(line.time)}
            title="Tocar a partir daqui"
          >
            {line.text}
          </button>
        );
      })}
    </div>
  );
}
