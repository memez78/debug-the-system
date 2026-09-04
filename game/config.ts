/**
 * Debug The System — tunable game settings.
 *
 * Every difficulty/economy number the game uses lives here, and nowhere
 * else. These are placeholder estimates (see CLAUDE_CODE_BRIEF.md §7/§8.3)
 * — they MUST be re-tuned from real playtest score data before the event.
 * Nothing here should ever be duplicated as a magic number elsewhere.
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
  // BD10 IS REACHABLE AS CONFIGURED. At 900 it takes exactly 25 flawless
  // answers, and because a correct tap resolves its question immediately
  // (rather than waiting the answer window out) a confident player cycles a
  // question in roughly 1.5-3s — comfortably 40+ questions inside a 120s
  // round. Treat 900 as a real, claimable prize. To price it out of reach
  // instead, raise this threshold (1900 ≈ 40 flawless answers) and re-check
  // nearMissProgress() in game/combo.ts, which is tuned against it.
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
   *  Currently 900 = a flawless 25-answer chain with no wrong taps and no
   *  timeouts, while camouflage and the illusion layer ramp up. Hard, but
   *  genuinely winnable; see the note above before changing it. */
  BD10_SCORE_THRESHOLD: 900,

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

  // ---- Engine internals -----------------------------------------------------
  /** Per-frame delta time is clamped to this many ms, so a dropped frame or
   *  a tab returning from background can never cause a catch-up burst. */
  MAX_FRAME_DT_MS: 100,
} as const;

/** Answer block layout, CSS px. Width is measured from the option text and
 * clamped to this range; height is fixed. Sized generously (3-4 options
 * max on screen at once) so they read clearly from booth distance. */
export const ANSWER_BLOCK_HEIGHT = 84;
export const ANSWER_BLOCK_MIN_WIDTH = 180;
export const ANSWER_BLOCK_MAX_WIDTH = 380;
export const ANSWER_BLOCK_PADDING_X = 32;
export const ANSWER_BLOCK_FONT_PX = 25;
