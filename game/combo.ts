import { CONFIG } from "./config";

export type ComboTier = "green" | "gold" | "white";

export function comboTier(combo: number): ComboTier {
  if (combo >= CONFIG.COMBO_TIER_WHITE_HOT) return "white";
  if (combo >= CONFIG.COMBO_TIER_GOLD) return "gold";
  return "green";
}

export function comboTierColor(tier: ComboTier): string {
  switch (tier) {
    case "white":
      return "#ffffff";
    case "gold":
      return "#ffd23f";
    default:
      return "#2effc7";
  }
}

export function pointsForCombo(combo: number): number {
  return CONFIG.BASE_POINTS_PER_CATCH + (combo - 1) * CONFIG.COMBO_BONUS_PER_STEP;
}

/**
 * Progress-bar fill (0-1) for a score, deliberately NOT linear.
 *
 * The 10 BD threshold is priced out of reach, so a linear bar would leave
 * even a great run sitting at a demoralising ~30%. This curve front-loads
 * the bar: real scores land in the 70-95% band and then crawl, so players
 * feel like they *almost* cracked it — the near-miss effect the whole booth
 * game is built around — while the last sliver stays effectively unreachable.
 * It never reports a full bar unless the score genuinely hits the threshold.
 */
export function nearMissProgress(score: number): number {
  const raw = Math.min(1, Math.max(0, score / CONFIG.BD10_SCORE_THRESHOLD));
  if (raw >= 1) return 1;
  // Steep early, then crawls. Against the current BD10_SCORE_THRESHOLD:
  //   50pts→48%, 150→60%, 400→73%, 900→86%, 1400→94%.
  // So a genuinely strong run sits in the high 80s and feels a hair away.
  // Capped just shy of full so the bar never lies about a win.
  return Math.min(0.97, Math.pow(raw, 0.2));
}
