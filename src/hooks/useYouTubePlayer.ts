import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wraps the YouTube IFrame Player API so we can read playback time and seek —
 * things a plain <iframe> embed can't do. Time updates are delivered through a
 * subscription (not React state) so the typing screen never re-renders on tick.
 */

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface PlayerController {
  seekTo(seconds: number, play?: boolean): void;
  play(): void;
  pause(): void;
  getTime(): number;
  /** Subscribe to playback time (seconds). Returns an unsubscribe fn. */
  subscribe(cb: (t: number) => void): () => void;
}

const TICK_MS = 120;

export function useYouTubePlayer(videoId: string, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const subs = useRef<Set<(t: number) => void>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastPush = useRef(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  const tick = useCallback(() => {
    const now = performance.now();
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === "function" && now - lastPush.current >= TICK_MS) {
      lastPush.current = now;
      const t = p.getCurrentTime() || 0;
      subs.current.forEach((cb) => cb(t));
    }
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadApi().then(() => {
      if (cancelled || !containerRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onStateChange: (e: any) => {
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, videoId]);

  useEffect(() => {
    if (playing) rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  useEffect(
    () => () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    },
    []
  );

  const controller = useRef<PlayerController>({
    seekTo: (seconds, play = true) => {
      const p = playerRef.current;
      if (!p || typeof p.seekTo !== "function") return;
      p.seekTo(Math.max(0, seconds), true);
      if (play) p.playVideo?.();
    },
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
    getTime: () => playerRef.current?.getCurrentTime?.() || 0,
    subscribe: (cb) => {
      subs.current.add(cb);
      return () => {
        subs.current.delete(cb);
      };
    },
  }).current;

  return { containerRef, ready, playing, controller };
}
