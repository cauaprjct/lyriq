import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { APP } from "./config";
import type { Mode, Prefs, SongMeta, TrainerItem } from "./types";
import { Setup } from "./screens/Setup";
import { Trainer } from "./screens/Trainer";

interface Session {
  items: TrainerItem[];
  meta: SongMeta;
  mode: Mode;
  prefs: Prefs;
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
            prefs={session.prefs}
            onExit={() => setSession(null)}
          />
        ) : (
          <Setup onStart={(items, meta, mode, prefs) => setSession({ items, meta, mode, prefs })} />
        )}

        <footer className="foot">
          <p>
            {APP.name} — aprenda inglês escrevendo música. Letras via lyrics.ovh, tradução via
            MyMemory. Nada é armazenado.
          </p>
        </footer>
      </main>
      <Analytics />
    </>
  );
}
