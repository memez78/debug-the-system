/**
 * Debug The System — tunable game settings.
 *
 * Every difficulty and economy number the game uses lives here and nowhere
 * else. Nothing in this file should ever be duplicated as a magic number
 * somewhere else in the codebase.
 *
 * The prize thresholds are worked out from the scoring maths (see the
 * reward-tier note further down — read it before touching BD10). Everything
 * else is a design-time estimate that has not been checked against real
 * play: run a few rounds with people who are seeing the game for the first
 * time and adjust from what you observe, not from what looks right here.
 */

export const CONFIG = {
  // ---- Round pacing --------------------------------------------------
  /** Total length of a round, in seconds. */
  ROUND_LENGTH_SEC: 120,
  /** Countdown turns urgent (red, mascot panics) inside this many seconds. */
  URGENT_TIME_SEC: 8,

  // ---- Question pacing -------------------------------------------------
  /** Tiny beat between the question banner appearing and its answers
   *  spawning. Deliberately short — the question and its answers should
   *  land together; the reading time is built into the answer window below. */
  QUESTION_READ_MS: 300,
  /** Brief pause after a question resolves (correct tap, or every option
   *  timing out unanswered) before the next question's banner appears. */
  QUESTION_RESOLVE_PAUSE_MS: 260,
  /** How many recently-asked question ids are remembered, to avoid repeats
   *  within one sitting. Set comfortably above the number of questions a fast
   *  player can get through in one round (~60), so a single round is
   *  effectively repeat-free against the 143-question bank. */
  QUESTION_HISTORY_SIZE: 60,

  // ---- Answer options ----------------------------------------------------
  /** Answer options shown per question at a correct-streak of 0. */
  ANSWER_COUNT_BASE: 3,
  /** Answer options shown once ANSWER_COUNT_STREAK_THRESHOLD is reached. */
  ANSWER_COUNT_MAX: 4,
  /** Correct-streak at which a 4th (extra decoy) option starts appearing. */
  ANSWER_COUNT_STREAK_THRESHOLD: 4,
  /** Wrong taps allowed on a single question before it auto-advances. On
   *  the Nth wrong tap the question is abandoned immediately (scored like a
   *  miss/timeout: combo resets, no points), so players can't keep retrying
   *  the same question by process of elimination. */
  MAX_WRONG_TAPS_PER_QUESTION: 2,

  // ---- Answer window (how long options stay tappable) — baseline ramp,
  // driven by elapsed round time, exactly like the old catch window ------
  /** Reaction window at round start, ms. This now covers *reading* the
   *  question too (they appear together), so it's generous up front but
   *  still much tighter than the old read-then-answer split. */
  ANSWER_WINDOW_START_MS: 5000,
  /** Reaction window by round end, ms — before streak escalation (below)
   *  shrinks it further. */
  ANSWER_WINDOW_END_MS: 2400,
  /** Answer block spawn-in scale-up tween duration, ms. */
  SPAWN_TWEEN_MS: 180,

  // ---- Streak escalation — stacks multiplicatively on top of the
  // time-based ramp above. Driven by the current correct-answer streak
  // (a wrong tap or an unanswered question resets it to 0), so the game
  // gets dramatically harder right when a player's score is climbing
  // fastest — the "near miss" hook the whole game is built around. --------
  /** Each point of correct-streak shrinks the answer window by this
   *  fraction (multiplicative, stacked on the time ramp). */
  ESCALATION_WINDOW_SHRINK_PER_STREAK: 0.045,
  /** Window shrink from streak alone never exceeds this fraction. */
  ESCALATION_WINDOW_SHRINK_CAP: 0.55,
  /** Answer block drift speed at round start, px/s (time ramp). */
  ANSWER_DRIFT_SPEED_START: 8,
  /** Answer block drift speed by round end, px/s (time ramp). */
  ANSWER_DRIFT_SPEED_END: 40,
  /** Extra drift speed added per point of correct-streak, px/s. */
  ANSWER_DRIFT_SPEED_PER_STREAK: 6,
  /** The streak's contribution to drift speed is capped here, px/s. */
  ANSWER_DRIFT_SPEED_STREAK_CAP: 90,
  /** Correct-streak at which blocks start getting camouflage treatment at
   *  all (flicker, jitter, chromatic ghosting). Below this they render
   *  completely still. Note this applies to EVERY block equally — nothing
   *  about how a block is drawn may depend on whether it is correct, or the
   *  answer is readable from across the room. */
  ESCALATION_CAMOUFLAGE_START_STREAK: 3,
  /** Correct-streak at which camouflage intensity reaches its maximum. */
  ESCALATION_CAMOUFLAGE_MAX_STREAK: 13,
  /** At full camouflage intensity, the peak chance in any given instant
   *  that a block is mid-"flicker" (its glow pulsing out of step with the
   *  others). Each block flickers on its own seeded phase, so the field
   *  reads as unstable rather than as one block behaving oddly. */
  ESCALATION_CAMOUFLAGE_FLICKER_CHANCE: 0.35,
  /** Max extra jitter amplitude applied to each block on its own phase, on
   *  top of the scene-wide wobble, px. */
  ESCALATION_CAMOUFLAGE_JITTER_PX: 5,
  /** Max chromatic-aberration ghost offset on every block, px. */
  ESCALATION_CHROMATIC_MAX_PX: 3,
  /** Max scene-wide canvas blur applied to the answer blocks, px. */
  ESCALATION_BLUR_MAX_PX: 1.6,
  /** Max scene-wide wobble amplitude applied to every block's draw
   *  position (not its actual hit-test position), px. */
  ESCALATION_WOBBLE_MAX_PX: 4,

  // ---- Scoring & streak (streak reuses the existing "combo" counter —
  // same formula/tiers as the original catch mechanic, just now driven by
  // consecutive correct answers instead of consecutive catches) ----------
  /** Flat points for a correct answer (before streak bonus). */
  BASE_POINTS_PER_CATCH: 10,
  /** Extra points added per streak step above x1. */
  COMBO_BONUS_PER_STEP: 2,
  /** Points lost for tapping a wrong answer (on top of resetting the
   *  streak) — score is clamped to never go below 0. A wrong tap has a
   *  real cost, not just a reset, so mistakes actually sting. */
  WRONG_ANSWER_PENALTY: 8,
  /** Streak is clamped to this ceiling. */
  MAX_COMBO: 30,
  /** Streak count at which the "gold" visual tier kicks in. */
  COMBO_TIER_GOLD: 4,
  /** Streak count at which the "white-hot" visual tier kicks in. */
  COMBO_TIER_WHITE_HOT: 8,

  // ---- Reward tiers ------------------------------------------------------
  // Score is the sum of pointsForCombo(streak-at-catch) across every correct
  // answer in the round. It never decreases from a broken streak (only a
  // wrong tap deducts, via WRONG_ANSWER_PENALTY) and has no ceiling — only
  // the streak multiplier is capped, by MAX_COMBO.
  //
  // The streak is incremented BEFORE the points are read, so the first
  // correct answer already pays pointsForCombo(2) = 12. A flawless chain of
  // N correct answers therefore scores N² + 11N:
  //   N:      1   2   3   4   5   6    8   10   14   16   20   25   30
  //   score: 12  26  42  60  80 102  152  210  350  432  620  900 1230
  //
  // Sticker and tech-kit are meant to be genuinely reachable — they're the
  // booth's conversation hooks.
  //
  // BD10 is deliberately priced just past the practical ceiling of a 120s
  // round. The number that matters is not "how many correct answers" but
  // "how many correct answers, and can they be split up":
  //
  //   1 clean run of 40  = 1908 pts, 40 answers  (~94s at a 2.4s cycle)
  //   2 clean runs of 26 = 1924 pts, 52 answers  (~125s — already too slow)
  //   3 clean runs of 21 = 2016 pts, 63 answers  (~151s)
  //   5 clean runs of 15 = 1950 pts, 75 answers  (~180s)
  //
  // That is the whole point of 1900. Because score grows with the square of
  // an unbroken run, every forgiving path needs more answers than fit in the
  // round — so the only route left is a near-flawless single run of 40 under
  // a window that is shrinking the whole way. At 900 the opposite was true:
  // five separate runs of nine got there in 45 answers, and since a broken
  // streak also resets the escalation, the punishing windows never arrived.
  //
  // It is NOT hard-blocked, so the prize claim stays honest — just priced
  // out of reach. If you change it, re-check nearMissProgress() in
  // game/combo.ts, which is tuned against this number.
  /** Minimum score for a sticker — a handful of correct answers. Also the
   *  trigger for the mid-round cinematic. Deliberately low-friction. */
  STICKER_SCORE_THRESHOLD: 50,
  /** Minimum score for a tech kit — a real stretch. Also the score at which
   *  the "illusion" escalation (colour shift, viruses, looming moon) kicks in. */
  TECH_KIT_SCORE_THRESHOLD: 150,
  /** Minimum score for the 10 BD grand prize. Reaching it ENDS THE ROUND
   *  immediately, however much time is left, and plays the win cinematic —
   *  the attract screen and the progress bar both advertise this number, so
   *  it has to be a finish line rather than a mark the score wanders past.
   *
   *  See the note above for why this is 1900 and not something lower. */
  BD10_SCORE_THRESHOLD: 1900,

  // ---- Leaderboard --------------------------------------------------------
  /** Entries kept in the local daily leaderboard. */
  LEADERBOARD_SIZE: 10,
  /** Max characters accepted in an arcade-style name entry. */
  NAME_MAX_LEN: 8,

  // ---- Screen flow / timing ------------------------------------------------
  /** Result screen auto-returns to attract mode after this long, ms. */
  RESULT_AUTO_RETURN_MS: 14000,
  /** How often the attract-mode "phantom demo" question cycle starts, ms. */
  PHANTOM_DEMO_INTERVAL_MS: 7000,
  /** How long the demo's question banner shows before its answers appear,
   *  ms — shorter than QUESTION_READ_MS so the attract loop stays lively. */
  PHANTOM_DEMO_READ_MS: 1400,
  /** How long the demo's answers stay up before the auto-catch, ms. */
  PHANTOM_DEMO_WINDOW_MS: 2600,
  /** Fraction of its window into the phantom demo's life it "auto-catches". */
  PHANTOM_DEMO_AUTO_CATCH_FRACTION: 0.55,

  // ---- Mascot flight — it flies freely and chases the pointer/last-touch
  // point instead of sitting at a fixed station, with a rocket-thruster
  // flame trailing opposite its direction of travel. ------------------------
  /** How fast the mascot closes the gap to its target each second (1/s) —
   *  higher is snappier. Exponential-lag chase, so it can never overshoot
   *  or oscillate regardless of frame timing. */
  MASCOT_FOLLOW_RATE: 7,
  /** Peak bank angle (radians) as it flies sideways. */
  MASCOT_TILT_MAX_RAD: 0.32,
  /** Speed (px/s) at which bank angle saturates to MASCOT_TILT_MAX_RAD. */
  MASCOT_TILT_SATURATION_SPEED: 480,
  /** Below this speed (px/s) the thruster flame is fully off. */
  MASCOT_FLAME_MIN_SPEED: 40,
  /** Speed (px/s) at which the flame reaches its maximum length/width. */
  MASCOT_FLAME_MAX_SPEED: 520,
  /** Flame length at max speed, px. */
  MASCOT_FLAME_MAX_LENGTH: 70,

  // ---- Attract-mode "10 BD" prize note — a real photo of the BD10 note
  // (see game/prizeNote.ts) that periodically drops in and settles, so the
  // prize reads at a glance even to someone who never stops to read the
  // title text. ---------------------------------------------------------
  /** How often a note drop starts, ms. */
  PRIZE_NOTE_INTERVAL_MS: 4500,
  /** Drop-and-settle animation duration, ms. */
  PRIZE_NOTE_DROP_MS: 700,
  /** How long it lingers at rest before fading out, ms. */
  PRIZE_NOTE_HOLD_MS: 3200,
  /** Fade-out duration, ms. */
  PRIZE_NOTE_FADE_MS: 700,

  // ---- Audio -----------------------------------------------------------------
  // Every sound is synthesised at runtime (see game/sound.ts) — there are no
  // audio files to license or load. Press M during play to mute.
  /** Master output level, 0-1. Kept low: these are square/saw waves, which
   *  are far harsher per unit of gain than recorded samples, and a booth
   *  runs this for hours. */
  SOUND_MASTER_VOLUME: 0.35,
  /** Background music level, relative to master. Low by design: this plays
   *  on a loop all day at a booth, and music you notice is music that
   *  becomes irritating by hour three. */
  SOUND_MUSIC_VOLUME: 0.4,
  /** Seconds per music step. 8 steps to a bar, so this is a slow ~0.75 Hz
   *  pulse — unhurried enough to sit behind conversation. */
  SOUND_MUSIC_STEP_SEC: 0.75,
  /** How loud the mascot's thruster roar gets at full throttle. */
  SOUND_THRUST_VOLUME: 0.16,
  /** How loud the virus drone gets at full illusion intensity. */
  SOUND_DREAD_VOLUME: 0.22,
  /** Music level per phase, as a fraction of SOUND_MUSIC_VOLUME.
   *
   *  Music plays on the attract screen only. That screen is a loop nobody is
   *  concentrating on, where a bed of sound is what pulls people over to the
   *  booth. Everywhere else it competes: a round is dense with cues that
   *  carry information (streak pitch, countdown, timeouts), the cinematics
   *  are dialogue, and the result screen is someone reading their score. */
  SOUND_MUSIC_LEVEL_ATTRACT: 1,
  SOUND_MUSIC_LEVEL_CINEMATIC: 0,
  SOUND_MUSIC_LEVEL_PLAYING: 0,
  SOUND_MUSIC_LEVEL_RESULT: 0,

  // ---- Rendering performance ------------------------------------------------
  // How expensively the scene may be painted, per device tier. See
  // game/quality.ts for what a tier actually switches. None of this touches
  // difficulty, scoring or the question mechanic — a phone and the booth
  // kiosk play exactly the same game, they just paint it at different cost.
  /** Backing-store scale cap on the high tier. Above 2 the extra pixels are
   *  invisible at arm's length and cost real fill rate. */
  QUALITY_DPR_CAP_HIGH: 2,
  /** Backing-store scale cap on the low tier. A 3x phone renders roughly
   *  half as many pixels per frame at 1.5 as it would at 2. */
  QUALITY_DPR_CAP_LOW: 1.5,
  /** ctx.shadowBlur multiplier per tier; 0 disables canvas shadows. The
   *  radial-gradient glows underneath the blocks and the mascot are not
   *  shadows, so the neon look survives the low tier. */
  QUALITY_SHADOW_SCALE_HIGH: 1,
  QUALITY_SHADOW_SCALE_LOW: 0,
  /** Digital-rain density and trail-length multiplier per tier. The rain is
   *  the single biggest source of draw calls in an idle frame. */
  QUALITY_RAIN_SCALE_HIGH: 1,
  QUALITY_RAIN_SCALE_LOW: 0.5,
  /** Below this viewport minimum-dimension (px), a coarse pointer is taken
   *  to mean a phone rather than a kiosk touchscreen. */
  QUALITY_SMALL_SCREEN_PX: 900,
  /** navigator.hardwareConcurrency at or below this starts on the low tier. */
  QUALITY_LOW_CORE_COUNT: 4,
  /** navigator.deviceMemory (GB) at or below this starts on the low tier. */
  QUALITY_LOW_MEMORY_GB: 4,
  /** Frames measured before the adaptive quality check runs. */
  QUALITY_SAMPLE_FRAMES: 90,
  /** Median frame time (ms) above which the renderer drops to the low tier.
   *  22ms is a sustained miss of the 16.7ms budget, not a single hiccup. */
  QUALITY_DOWNGRADE_FRAME_MS: 22,
  /** A frame longer than this is a stall (GC pause, tab refocus, first paint
   *  after a phase change), not a steady-state cost, and is left out of the
   *  measurement rather than allowed to condemn a fast device. */
  QUALITY_STALL_FRAME_MS: 250,

  // ---- Engine internals -----------------------------------------------------
  /** Per-frame delta time is clamped to this many ms, so a dropped frame or
   *  a tab returning from background can never cause a catch-up burst. */
  MAX_FRAME_DT_MS: 100,
} as const;

/**
 * At or below this viewport width the game switches to its narrow layout.
 *
 * Set above a portrait tablet (768px), not just a phone: the desktop layout
 * gives each block only width/count of room, which at 768px with four
 * options is 192px against blocks up to 380px wide — overlapping by
 * construction. The booth kiosk is far wider and is unaffected by any of it.
 */
export const PHONE_MAX_WIDTH_PX = 820;

/**
 * Answer block layout, CSS px. Width is measured from the option text and
 * clamped to the range; height is fixed per layout.
 *
 * DESKTOP is the booth sizing and must not change — blocks are sized
 * generously so they read from across a room.
 *
 * PHONE exists because the desktop numbers are impossible on a narrow
 * screen: a 380px block does not fit inside a 375px viewport at all, and
 * three of them scattered into columns of width/3 overlap by construction.
 * See `blockMetrics` in game/answerBlocks.ts.
 */
export const ANSWER_BLOCK_DESKTOP = {
  height: 84,
  minWidth: 180,
  maxWidth: 380,
  paddingX: 32,
  fontPx: 25,
  /** Scatter freely in columns; there is room for blocks to pass each other. */
  stacked: false,
} as const;

export const ANSWER_BLOCK_PHONE = {
  height: 62,
  minWidth: 150,
  maxWidth: 340,
  paddingX: 18,
  fontPx: 18,
  /** One block per row, drifting sideways only, so two can never overlap on
   *  a screen that has no room for them to avoid each other. */
  stacked: true,
} as const;
