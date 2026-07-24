import { memo, type RefObject } from "react";
import type { PlayerController } from "../hooks/useYouTubePlayer";
import type { SyncedLine } from "../lib/lrc";
import { SyncedLyrics } from "./SyncedLyrics";

/**
 * The YouTube IFrame API *replaces* its target node with an <iframe>. Isolating
 * it in a memoized component (stable props) guarantees React never re-renders
 * or reconciles that node, so the player survives panel re-renders/toggles.
 */
const PlayerFrame = memo(function PlayerFrame({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="media__video">
      <div ref={containerRef} />
    </div>
  );
});

interface Props {
  visible: boolean;
  containerRef: RefObject<HTMLDivElement>;
  controller: PlayerController;
  loadingSync: boolean;
  hasSync: boolean;
  lines: SyncedLine[];
  paraStarts: Set<number>;
  offset: number;
  onOffset: (delta: number) => void;
  onSeekLine: (lineTime: number) => void;
}

export function MediaPanel({
  visible,
  containerRef,
  controller,
  loadingSync,
  hasSync,
  lines,
  paraStarts,
  offset,
  onOffset,
  onSeekLine,
}: Props) {
  return (
    <div className={"media" + (visible ? "" : " media--hidden")} aria-hidden={!visible}>
      <PlayerFrame containerRef={containerRef} />

      {hasSync ? (
        <div className="media__lyrics">
          <div className="synced-head">
            <span className="synced-head__label">Letra sincronizada</span>
            <div className="offset" role="group" aria-label="Ajuste de sincronia">
              <button
                type="button"
                className="offset__btn"
                onClick={() => onOffset(-0.5)}
                aria-label="Adiantar a letra em meio segundo"
              >
                −0,5s
              </button>
              <span className="offset__value" aria-live="polite">
                {offset > 0 ? "+" : ""}
                {offset.toFixed(1)}s
              </span>
              <button
                type="button"
                className="offset__btn"
                onClick={() => onOffset(0.5)}
                aria-label="Atrasar a letra em meio segundo"
              >
                +0,5s
              </button>
            </div>
          </div>
          <SyncedLyrics
            lines={lines}
            paraStarts={paraStarts}
            controller={controller}
            offset={offset}
            onSeekLine={onSeekLine}
          />
        </div>
      ) : loadingSync ? (
        <p className="synced-note">Procurando letra sincronizada…</p>
      ) : (
        <p className="synced-note">
          Sem letra sincronizada pra essa música — o vídeo toca normalmente.
        </p>
      )}
    </div>
  );
}
