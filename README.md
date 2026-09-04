# Debug The System

A fast, trivia-driven arcade game built for the Bahrain Polytechnic Tech
Club's orientation-day kiosk booth. Each round is a rapid sequence of IT
questions — read the banner, then tap the correct answer among 3-4 drifting
options before the window closes. Get on a streak and the game actively
starts working against you (faster movement, closer-looking decoys, and the
correct answer itself getting harder to spot at a glance) on the way to the
10 BD threshold.

Next.js (App Router) + TypeScript, HTML5 Canvas rendering, CSS Modules for
the UI overlay. No backend, no database, no environment variables — the
daily leaderboard lives in the browser's `localStorage`.

## Local development

Requires [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The game is a single full-screen page — tap or
click anywhere on the attract screen to start a round.

## Production build

```bash
npm run build
```

This is exactly what Vercel runs at deploy time, so run it locally before
handing the project off. `npm start` then serves the built app.

## Deploying to Vercel

No configuration needed — a stock Next.js app with zero environment
variables and no external services.

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Go to <https://vercel.com/new> and import the repo.
3. Leave every setting on its default (Framework Preset: Next.js) and click
   **Deploy**.
4. Every future push to the default branch auto-deploys.

## Running the booth

- Open the deployed URL full-screen (F11) on the kiosk machine.
- The attract screen loops on its own; it never needs a reset between
  players. The result screen returns to attract by itself after
  `CONFIG.RESULT_AUTO_RETURN_MS`.
- The leaderboard is per-browser and per-day. It resets at midnight and is
  not shared between devices — that is deliberate, so there is no backend
  to run on the day.

## How a round works

`attract → intro → playing → (interlude) → outro → result → attract`

The intro, mid-round interlude and outro are **cinematics**
(`game/cinematic.ts`): scripted sequences with the mascot talking over
illustrated art.

The **intro waits for the player**. Each line stays on screen until they tap,
because that is the one place someone is meeting the robot and the premise
for the first time and a slow reader must not lose the line. The interlude
and both outros **play themselves through** — they are beats inside a round
already in motion, and stopping to ask for a tap there kills the momentum; a
tap still skips ahead for anyone who has seen them. Which is which is set by
`HOLDS_FOR_TAP` in `game/cinematic.ts`.

A held line moves on by itself after 45 seconds. That is not pacing — it is
the abandoned-kiosk safety net, so the booth is never left stuck on a
half-finished scene for the next student. They are purely presentational and never
touch scoring, the question mechanic, the leaderboard or the reward tiers.
The interlude fires once per round, the first time a player crosses the
sticker threshold, and the round clock is paused for its duration so it
never eats into anyone's answering time.

Inside `playing`, each question cycle is:

1. The question banner appears for `CONFIG.QUESTION_READ_MS` (a short beat,
   not a full reading pause — the answer window below is what carries the
   reading time).
2. 3-4 short answer options spawn as drifting, glowing blocks. Tap the right
   one and the question resolves immediately. Tap a wrong one and the streak
   resets, `CONFIG.WRONG_ANSWER_PENALTY` points come off the score (clamped
   at zero), and the block disappears — but the question stays live. After
   `CONFIG.MAX_WRONG_TAPS_PER_QUESTION` wrong taps the question is abandoned
   outright, so it cannot be brute-forced by elimination. If every option
   times out unanswered, the streak resets and the next question begins.
3. Difficulty escalates with the **correct-answer streak**, stacked on top of
   the elapsed-round-time ramp: the answer window shrinks, a 4th decoy
   appears, blocks drift faster, wrong options converge toward the correct
   answer's colour, and past `ESCALATION_CAMOUFLAGE_START_STREAK` the correct
   block itself starts flickering into decoy styling, jittering, and picking
   up chromatic-aberration ghosting. The question text is never touched by
   any of this — only the answer blocks and the scene get harder to read.
4. Once the score passes `CONFIG.TECH_KIT_SCORE_THRESHOLD` the **illusion**
   layer (`game/illusion.ts`) ramps in: the scene washes red, viruses drift
   across the field and the moon looms in from the top. It is atmosphere
   only — nothing there is tappable and nothing there affects scoring. It
   draws *behind* the answer blocks so options stay readable.

## Sound

Every sound is **synthesised at runtime** by [`game/sound.ts`](game/sound.ts)
using the Web Audio API. There are no audio files in this project on purpose:
short synthesised blips are the right texture for an arcade cabinet, and it
means nothing to download, nothing to license, no delay before the first
sound, and every tone is a number you can tune rather than an asset you have
to re-record.

Cues are wired to correct and wrong answers (the correct one rises in pitch
with the streak), a failed question, a timeout, answers appearing, the round
starting, the per-second countdown beep over the closing seconds, each line
of cinematic dialogue, captioned beats, and the interlude/win/loss stings.

- **Press `M` to mute** (ignored while typing a name on the result screen).
- Overall level is `CONFIG.SOUND_MASTER_VOLUME`. It is deliberately low —
  square and saw waves are much harsher per unit of gain than recorded
  samples, and a booth runs this for hours.
- Browsers keep audio silent until a real user gesture, so the audio context
  is built on the first tap. Nothing plays on the attract screen before
  anyone has touched it, which is intentional.

## Questions

All questions live in [`game/questions/tech.ts`](game/questions/tech.ts) —
143 beginner-level IT/computing questions, `{ id, category, question,
options[], correctIndex }`. The authoring rules (option length, why every
decoy must be independently wrong, why `correctIndex` is always 0) are
documented at the top of that file; read them before adding more.

`pickNextQuestion()` in [`game/questions.ts`](game/questions.ts) avoids
repeats by remembering the last `CONFIG.QUESTION_HISTORY_SIZE` ids, which is
set above the number of questions a fast player gets through in one round —
so a single round is effectively repeat-free.

## Tuning the game

Every difficulty and reward number — round/question pacing, answer window,
the streak-escalation curve, camouflage intensity, scoring, and the
sticker/tech-kit/10 BD thresholds — lives in one place:
[`game/config.ts`](game/config.ts). Nothing else in the codebase hardcodes
these values.

**Read the reward-tier comment block in `config.ts` before changing the
prize thresholds.** The important fact, since real money is attached:

> A flawless chain of N correct answers scores **N² + 11N**. At the current
> `BD10_SCORE_THRESHOLD` of 900 that is **25 flawless answers**, and because
> a correct tap resolves its question immediately rather than waiting out the
> answer window, a confident player cycles a question in roughly 1.5-3s and
> can attempt 40+ questions inside a 120s round. **The 10 BD prize is
> genuinely winnable as configured.** Budget for someone claiming it, or
> raise the threshold (1900 ≈ 40 flawless answers) if it must be a long shot.

If you change `BD10_SCORE_THRESHOLD`, re-check `nearMissProgress()` in
[`game/combo.ts`](game/combo.ts) — the progress bar's non-linear curve is
tuned against that number so a good run still *feels* close to the prize.

The remaining numbers were derived from the scoring math rather than from
measured play. Run a few real playtest rounds with people who aren't club
members, note the score spread, and adjust so the sticker tier is easy, the
tech-kit tier is a stretch, and the 10 BD tier lands wherever you want it.

## How it's organised

- `game/` — the engine: state machine, canvas rendering, input, question
  cycle, escalation, mascot, particles, leaderboard storage. Plain
  TypeScript with no React, running its own `requestAnimationFrame` loop
  outside React's render cycle.
  - `questions/tech.ts` — the question bank. `questions.ts` picks the next one.
  - `escalation.ts` — streak + elapsed time to concrete difficulty numbers.
  - `answerBlocks.ts` — spawns, drifts and draws the answer blocks, including
    the camouflage/chromatic/wobble effects.
  - `cinematic.ts` — intro/interlude/outro sequences and their dialogue.
  - `illusion.ts` — the late-round red/virus/moon atmosphere layer.
  - `config.ts` — every tunable number. `canvasFont.ts` — the canvas font
    stack (canvas cannot resolve CSS `var()`, so it must be concrete).
- `components/` — the React/DOM layer: mounts the canvas and renders the
  attract/HUD/result/name-entry overlays on top by subscribing to the
  engine's state through `useSyncExternalStore`.
- `app/` — the Next.js App Router shell (one route).

## Robustness notes

- All `localStorage` access is wrapped in try/catch and fails silently, so
  private browsing or full storage never crashes the game.
- The round timer runs on an internal clock that only advances on visible,
  dt-clamped frames. Alt-tabbing, a notification popup or a dropped frame
  cannot desync or fast-forward a round.
- Taps are debounced by construction: a block is removed from play the
  instant it is hit, so mashing can't double-count an answer.
- If a browser lacks `<canvas>` or `requestAnimationFrame`, a plain fallback
  message is shown instead of a blank screen.

## Asset credits

- `public/prize/bd10_note.jpg` — photo of the Bahraini 10 Dinar note by
  [ValeewIldar](https://commons.wikimedia.org/wiki/User:ValeewIldar) via
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%D0%91%D0%B0%D1%85%D1%80%D0%B5%D0%B9%D0%BD_10.jpg),
  licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  Used as-is for the attract-mode prize drop in `game/prizeNote.ts`. If it is
  ever edited or remixed, the share-alike clause applies to the result.
- `public/mascot/*.png` — Kenney "Toon Characters" robot pose set, CC0
  (public domain, no attribution required). See `game/mascot.ts`.
- `public/cinematic/*.png` — moon, server (intact and destroyed frames) and
  virus characters, generated for this project to match the mascot's art
  style. Used by `game/cinematic.ts` and `game/illusion.ts`.
