# Product

## Register

product

## Platform

web

## Users
A Brazilian Portuguese speaker learning English who already knows and likes the song they pick. They use this on a laptop, keyboard in front of them, with the track playing. The job to be done: turn a song they already love into active writing practice, typing the English lyrics and getting immediate, precise correction, rather than passively reading a translation. The prompt language is theirs to choose (Portuguese by default, plus Spanish, French, German and Italian), because the point is writing English, not reading English.

## Product Purpose
A typing trainer built around songs the learner already sings. It shows each line's meaning in their language and asks them to write the English, then grades it word by word so mistakes are visible and fixable. Ten curated songs, tagged by level, get them started in one tap; any YouTube link works too. The learner chooses how to practise: translation or dictation, one line or a whole paragraph, their own rhythm or letting the song set the pace. Success is a session where the learner writes a whole song, sees exactly which words tripped them up, and wants to run it again to beat their accuracy.

## Positioning
Learn English by writing the songs you already sing, one line at a time, with correction that shows you the exact word you missed.

## Privacy stance
Nothing leaves the browser. There is no account and no database of our own: progress and training preferences live in `localStorage`, and lyrics are fetched on demand and never stored. This is a product position, not just an implementation detail, and any future sync feature has to be weighed against it.

## Brand Personality
Atmospheric and calm, not gamified-loud. The voice is a quiet coach: encouraging on a hit, matter-of-fact on a miss, never patronizing. Three words: smoldering, focused, human. The mood is ash and ruins with an ember of hope, inherited from "Pompeii" (the song the trainer was first built around, still the built-in demo) and kept as the brand's own, so the interface feels like a late-night practice session rather than a classroom app.

## Anti-references
Not Duolingo (cartoon mascots, streak-guilt, confetti spam). Not a flashcard grid. Not a generic SaaS dashboard with a cream background and a hero-metric row. No gradient text, no glassmorphism, no badge soup.

## Design Principles
- A short, curated catalog plus any song the learner brings, never an endless bank of generic exercises.
- Correction over judgment: show the exact words, let the learner see the fix.
- The song sets the mood; the UI stays out of the way of typing.
- Keyboard-first: the whole loop works without touching the mouse.
- Calm feedback: acknowledge progress without shouting.
- The learner's choices are remembered, so the app never asks the same question twice.

## Accessibility & Inclusion
Target WCAG 2.1 AA. Full keyboard operability, visible focus states, body text ≥4.5:1 on the dark surface, honor `prefers-reduced-motion` with crossfades instead of movement, and never signal correctness by color alone (pair color with icon/label and word markup).
