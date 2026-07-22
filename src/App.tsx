import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { APP } from "./config";
import type { Mode, SongMeta, TrainerItem } from "./types";
import { Setup } from "./screens/Setup";
import { Trainer } from "./screens/Trainer";

interface Session {
  items: TrainerItem[];
  meta: SongMeta;
  mode: Mode;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);

  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient__smoke" />
        <div className="ambient__ember" />
        <div className="ambient__grain" />
      </div>

      <main className="shell">
        {session ? (
          <Trainer
            items={session.items}
            meta={session.meta}
            mode={session.mode}
            onExit={() => setSession(null)}
          />
        ) : (
          <Setup onStart={(items, meta, mode) => setSession({ items, meta, mode })} />
        )}

        <footer className="foot">
          <p>
            <kbd>Enter</kbd> confere · <kbd>Shift</kbd>+<kbd>Enter</kbd> quebra linha · {APP.name}{" "}
            usa letras do lyrics.ovh e tradução do MyMemory.
          </p>
        </footer>
      </main>
      <Analytics />
    </>
  );
}
