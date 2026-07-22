# Design

## Theme
Dark, atmospheric, single-scene. The physical scene: a late-night writing session lit by the glow of a screen, ash-grey clouds above, an ember of lava red smoldering below, drawn directly from "Pompeii" (Vesuvius over the city). Dark is a deliberate choice, not a default: it keeps focus on the line being typed and matches the song's "darkness from above / close your eyes" mood. Color strategy: Committed — the ember red carries all primary action and error feedback against an ashen neutral field.

## Color (OKLCH)
- `--bg`: oklch(0.17 0.010 250) — ashen near-black, faint cool volcanic-smoke tint
- `--surface`: oklch(0.215 0.012 250) — raised panels, the typing card
- `--surface-2`: oklch(0.26 0.014 250) — inputs, chips
- `--border`: oklch(0.34 0.014 250)
- `--ink`: oklch(0.95 0.006 250) — body/heading text, >12:1 on bg
- `--muted`: oklch(0.72 0.012 250) — secondary text, ≥4.5:1 on bg
- `--primary` (ember red): oklch(0.56 0.195 22) — primary buttons, progress fill, brand
- `--primary-strong`: oklch(0.62 0.205 25) — hover
- `--accent` (molten amber): oklch(0.80 0.135 72) — hints, highlights, "missing word" marks
- Semantic feedback:
  - correct: oklch(0.76 0.13 158) — sage/ember-lit green, paired with a check glyph
  - wrong: oklch(0.66 0.20 22) — ember red, paired with underline + label
  - missing: oklch(0.80 0.135 72) — amber, ghosted
Text on filled ember-red uses near-white ink; text on amber uses the dark bg.

## Typography
Contrast-axis pairing (serif + sans):
- Display / lyric lines: "Fraunces" (optical serif) — the Portuguese prompt and song title, giving the content an editorial, sung-aloud weight.
- UI / body / data: "Inter" — buttons, labels, counters, feedback words.
- Fixed rem scale (product register), ratio ~1.2. Hero title clamp max ≤ 3.5rem. `text-wrap: balance` on headings.

## Motion
150–250ms UI transitions, ease-out-quart. Line changes crossfade + rise 8px via AnimatePresence. Feedback words stagger in ~20ms apart. Progress bar fills on advance. A faint ember glow at the base of the screen breathes slowly (8s). All motion collapses to instant crossfade under `prefers-reduced-motion: reduce`.

## Layout
Single centered column, max ~720px, generous vertical rhythm. The typing card is the one elevated surface. Ambient layers (smoke gradient top, ember glow bottom) sit behind at low opacity. Fully responsive down to 360px; the card and controls reflow, type scale holds (no fluid shrink).
