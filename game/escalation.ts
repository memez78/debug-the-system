import { CONFIG } from "./config";
import { clamp01, lerp } from "./utils";

/** Everything difficulty-related for the current question, derived from
 * the correct-answer streak and how far into the round we are. Time (`t`,
 * 0-1) drives the baseline ramp; streak stacks escalation on top of it. */
export interface Escalation {
  answerCount: number;
  windowMs: number;
  driftSpeed: number;
  /** 0-1: how strongly camouflage effects (flicker/jitter/chromatic/blur/
   * wobble) apply. 0 below ESCALATION_CAMOUFLAGE_START_STREAK. */
  camoIntensity: number;
}

export function getEscalation(streak: number, t: number): Escalation {
  const answerCount = streak >= CONFIG.ANSWER_COUNT_STREAK_THRESHOLD ? CONFIG.ANSWER_COUNT_MAX : CONFIG.ANSWER_COUNT_BASE;

  const windowShrink = Math.min(CONFIG.ESCALATION_WINDOW_SHRINK_CAP, CONFIG.ESCALATION_WINDOW_SHRINK_PER_STREAK * streak);
  const baseWindow = lerp(CONFIG.ANSWER_WINDOW_START_MS, CONFIG.ANSWER_WINDOW_END_MS, t);
  const windowMs = baseWindow * (1 - windowShrink);

  const driftSpeed =
    lerp(CONFIG.ANSWER_DRIFT_SPEED_START, CONFIG.ANSWER_DRIFT_SPEED_END, t) +
    Math.min(CONFIG.ANSWER_DRIFT_SPEED_STREAK_CAP, CONFIG.ANSWER_DRIFT_SPEED_PER_STREAK * streak);

  const camoRange = Math.max(1, CONFIG.ESCALATION_CAMOUFLAGE_MAX_STREAK - CONFIG.ESCALATION_CAMOUFLAGE_START_STREAK);
  const camoIntensity = clamp01((streak - CONFIG.ESCALATION_CAMOUFLAGE_START_STREAK) / camoRange);

  return { answerCount, windowMs, driftSpeed, camoIntensity };
}
