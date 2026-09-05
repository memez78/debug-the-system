/** "intro" and "outro" are the cinematic sequences wrapped around a round:
 * attract → intro → playing → outro → result. They are purely presentational
 * — no scoring, difficulty or leaderboard logic runs during them. */
export type GamePhase = "attract" | "intro" | "playing" | "interlude" | "outro" | "result";

/** Sub-state of the result screen: collecting a top-10 name, or just showing the summary. */
export type ResultSubphase = "nameEntry" | "summary";

/** Only one pool ships today. Kept as a named type (rather than inlined)
 * so adding a second pool later is a one-line change here plus a colour in
 * game/answerBlocks.ts. */
export type QuestionCategory = "tech";

/** Sub-state of a round while playing: the fixed-read grace period before
 * any answers appear, vs. the hunt-and-tap window once they've spawned. */
export type QuestionPhase = "reading" | "answering";

export type RewardTier = "none" | "sticker" | "kit" | "bd10";

export type MascotAnim = "idle" | "reach" | "celebrate" | "panic" | "flinch";

export interface Question {
  id: string;
  category: QuestionCategory;
  question: string;
  /** 4 short options (single words/short phrases only) — the engine may
   * show a subset (see CONFIG.ANSWER_COUNT_*) but always includes correctIndex. */
  options: string[];
  correctIndex: number;
}

/** A single tappable answer option, spawned from the current question's
 * options. Drifts around the play field; only one per question is correct. */
export interface AnswerBlock {
  id: number;
  text: string;
  isCorrect: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  /** Block size and text size are resolved once at spawn from the viewport
   * (see blockMetrics) and carried on the block, so hit-testing, drifting
   * and drawing all read the same numbers without threading a metrics
   * object through every call. */
  height: number;
  fontPx: number;
  spawnedAt: number;
  expiresAt: number;
  /** Stable per-block seed driving deterministic flicker/jitter/wobble
   * timing, so camouflage effects look like animation, not random noise. */
  seed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  age: number;
  life: number;
  text: string;
  color: string;
  size: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  ts: number;
}

export interface RoundResult {
  score: number;
  tier: RewardTier;
  qualifiesForLeaderboard: boolean;
}

/** Snapshot of everything the React overlay needs to render; a fresh object
 * is only produced when something UI-relevant actually changes. */
export interface EngineUiState {
  phase: GamePhase;
  canvasReady: boolean;
  score: number;
  combo: number;
  comboTier: "green" | "gold" | "white";
  timeLeftSec: number;
  urgent: boolean;
  topScoresToday: LeaderboardEntry[];
  result: RoundResult | null;
  resultSubphase: ResultSubphase;
  flashFact: string | null;
  questionPhase: QuestionPhase | null;
  questionText: string | null;
}
