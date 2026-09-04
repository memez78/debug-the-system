# Code review checklist

A working list for this repo. The first section is what a review pass
actually found and fixed here; the second is the recurring class of mistake
that keeps showing up in AI-assisted code, phrased as things to grep for
rather than general advice.

Run these three before every commit. All three are currently clean:

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

---

## Issues found and fixed in this repo

| # | Issue | Why it mattered |
|---|---|---|
| 1 | `beginRound()` did not reset `nextQuestionAt` | If a round's timer expired during the pause between two questions, the next round inherited a timestamp already in the past and skipped its own first question on frame one. |
| 2 | Illusion viruses flipped `vy` every frame when outside the bounce band | After a window resize a virus could sit permanently outside the band, inverting its velocity every frame and vibrating in place instead of drifting. Now clamped as well as flipped. |
| 3 | Long answer text overflowed its block | Block width is clamped to `ANSWER_BLOCK_MAX_WIDTH`, but `fillText` had no `maxWidth`, so a long option spilled outside the rounded rect. |
| 4 | Cinematic subtitles did not wrap | Longer dialogue ran past the panel on a narrow window. Now greedy-wrapped and the panel is sized to the wrapped result. |
| 5 | The scoring table in `config.ts` was wrong | It documented `N² + 9N` (10, 22, 36…). The streak is incremented *before* points are read, so it is actually `N² + 11N` (12, 26, 42…). That table is what anyone re-tuning the prize thresholds would trust — and it made 10 BD look further away than it is. |
| 6 | `QuestionCategory` still had a `"funny"` member | The funny pool was deleted; nothing could produce that value any more. |
| 7 | `questionCategory` was plumbed through six files and never read | Engine → UI state → both overlays → `QuestionBanner`, which destructured `text`, `phase`, `compact` and dropped it. |
| 9 | **The correct answer was a different colour from the decoys** | `CORRECT_COLOR` vs a wrong colour, plus jitter and chromatic ghosting applied to the correct block *only* — three separate tells. The right answer was identifiable from across the room without reading the question. The escalation had been built on "the correct one looks different, now disguise it", which is backwards; it should never have looked different. |
| 10 | The prize threshold was not a finish line | The score could pass `BD10_SCORE_THRESHOLD` and the round carried on to the full 120s, while the attract screen and progress bar advertised that number as the win condition. Reaching it now ends the round on the spot and plays the win cinematic. |
| 11 | **The frame was built for a desktop GPU** | On a phone the renderer set `ctx.filter = blur()` around the answer blocks (which makes the browser blur every subsequent draw call through a scratch surface — ~32 a frame), drew 1024px PNGs scaled down to 100px without a pre-scaled copy, rebuilt every gradient and colour string per frame, and painted several hundred `fillText` calls of digital rain with a `fillStyle` change before each one. See `game/quality.ts` and **Performance on phones** in the README. |
| 12 | An answer block could be wider than the screen | `ANSWER_BLOCK_MAX_WIDTH` is 380, so on a 375px phone a long option produced a block that could not fit; `updateAnswerBlocks` then pinned it against the left and right edges on the same frame, fighting itself. `measureBlockWidth` now clamps against the canvas width too. |
| 13 | `viewport-fit: cover` with no safe-area padding | `app/layout.tsx` opts the page into drawing under the notch and home indicator, but no overlay reserved space for them, so the score row sat under the notch on a modern iPhone. The three overlay roots now add `env(safe-area-inset-*)`. |
| 8 | README documented removed modules and wrong mechanics | It referenced `questions/funny.ts` and `CONFIG.TECH_QUESTION_MIX` (both gone) and said a wrong answer carried "no score penalty" when it costs 8 points. |

---

## Recurring AI-codegen failure modes, and how to catch them

These are the patterns that actually bit this project. Each one is
grep-able, which matters more than knowing the principle.

### 1. Comments that document intent instead of behaviour

The single most dangerous category here, because a confident comment gets
trusted instead of the code. Issue 5 above is the example: the scoring table
was internally consistent, well formatted, and wrong.

**Check:** for any comment stating a formula, a rate, a threshold or a
percentage, compute one value from the running code and compare. In this
repo the scoring formula was verified by playing six questions and reading
the score after each (12, 26, 42, 60, 80, 102), not by re-reading the maths.

### 2. Dead code left behind after a pivot

When a feature is removed, its type members, props and plumbing survive.
Issues 6 and 7 were both leftovers from cutting the joke-question pool.

**Check:** `npx eslint .` catches unused imports and locals but *not* an
unused prop that is still passed and still typed. After removing a feature,
grep its name across the repo and expect zero hits.

### 3. Silent no-ops in canvas code

The canvas API swallows invalid input instead of throwing. This project lost
real time to `ctx.font = "...var(--font-mono)"`, which canvas cannot resolve
— it silently kept the previous font, so raising the font size appeared to
do nothing. That is why `game/canvasFont.ts` exists and why `CANVAS_FONT_STACK`
is a concrete stack.

**Check:** `ctx.font` never contains `var(`. Gradient colour stops are
`#rrggbb` or `rgba()` — a bad string throws at `addColorStop`, but a colour
built by string concatenation can produce one at runtime only.
`ctx.filter` is not universally supported and fails silently.

### 4. Two clocks that drift apart

The engine runs on `engineNow` (an internal, dt-clamped clock that only
advances on visible frames), not `performance.now()`. A module that seeds a
timer from `performance.now()` and compares it against `engineNow` will
either fire immediately or never. This happened once in the deleted
`sceneBackdrop` module.

**Check:** grep for `performance.now()` — it should appear only in
`GameEngine.attach` and `GameEngine.onVisibilityChange`, both of which are
re-seeding `lastRealTime`. `frame` receives the real timestamp as its `rt`
argument; every other timestamp in the codebase comes from the `now`
parameter threaded down from `frame`.

### 4b. Per-frame work that only had to happen once

Canvas makes rebuilding state look free, because each individual call is
cheap and nothing warns you. The costs only show up on a slower GPU, which
is never the machine the code was written on.

**Check:** anything constructed inside a draw routine that does not depend
on the frame — `createLinearGradient`/`createRadialGradient`, a colour
string built by concatenation or hex parsing, an image scaled down from a
much larger source. All four were happening every frame here. A gradient
defined in a translated local space (centred on `0, 0`) is usually
identical frame to frame and belongs in `gradients.ts`.

**Check:** `ctx.filter` is not a cheap property. Assigning it makes every
following draw call render into an offscreen surface and get filtered.
Count the draws inside the `save`/`restore` that sets it before assuming
it is one blur.

**Check:** a `fillStyle` assignment is a state flush. Draw calls that share
a colour should be batched under one assignment — in `background.ts` that
meant looping trail position on the outside and columns on the inside,
which looks backwards and cut several hundred state changes to ten.

### 5. Magic numbers reintroduced next to the config

Every tunable belongs in `game/config.ts`. New code tends to inline a
number "just for now".

**Check:** grep for numeric literals in `game/*.ts` outside `config.ts`. The
legitimate exceptions are geometry constants local to one drawing routine.
Anything affecting difficulty, scoring, or pacing belongs in `CONFIG`.

### 6. Early return inside a state-machine update

`updatePrizeNote` originally began with `if (this.demoActive) return;`. A
note already mid-animation then froze on screen forever, because the code
that advances its phase lived below the return. The fix was to force the
phase to `fade` and let the rest of the function run.

**Check:** any `return` near the top of an `update*` method. Ask what
happens to state that is already in flight when the condition flips.

### 7. Overlapping UI, because canvas and DOM do not know about each other

The DOM overlay (question banner, HUD, progress bar) and the canvas answer
blocks are laid out by completely separate systems. Blocks drifted under the
timer until `GameEngine.fieldBounds()` reserved vertical bands per phase.

**Check:** after adding or resizing any DOM overlay element, update
`fieldBounds()` to match, and test at a short window height — the
`maxReserved` scale-back in that method exists for exactly that case.

### 8. Feedback that leaks the answer

The worst bug in this project's history was cosmetic: the correct answer
block was tinted differently from the decoys. Every individual decision that
led there was reasonable — a "correct" colour, a "wrong" colour, and an
escalation that blends them together as the streak grows — and the result was
a quiz where you never had to read the question.

**Check:** any function that renders something the player is meant to
identify must not receive the flag that says which one it is.
`drawAnswerBlock` takes no `isCorrect` parameter, which makes the mistake
impossible to make again rather than merely absent today. Where an effect has
to vary per item, seed it from something orthogonal to correctness
(`AnswerBlock.seed`).

**Verify it in pixels, not by reading the code.** Sample the rendered canvas
for each block and compare the correct one against the decoys — at streak 0
*and* at maximum camouflage, since the two paths differ.

### 9. Tests that race the state machine

Driving the engine from the console silently produced wrong results because
`beginRound()` resets the score, so setting a score before the phase reached
`playing` zeroed it.

**Check:** when scripting the engine, wait for the phase you expect before
asserting. The dev-only `window.__engine` handle (present outside production
builds only, see `components/GameRoot.tsx`) exposes `phase`, `score`,
`combo` and `answerBlocks` for exactly this.

---

## Before the event

- [ ] `npx tsc --noEmit`, `npx eslint .` and `npm run build` all clean.
- [ ] Play a full 120s round end to end on the actual kiosk machine, at its
      real resolution, in full screen.
- [ ] Confirm the intro, interlude and outro all read comfortably and that
      tapping skips them.
- [ ] Decide what happens if somebody actually wins the 10 BD — see the
      reward-tier note in `game/config.ts`. It is reachable as configured.
- [ ] Check the leaderboard survives a page refresh on the kiosk browser
      (it will not in private/incognito mode — that is by design, but know
      it in advance).
