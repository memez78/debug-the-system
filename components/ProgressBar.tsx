import { nearMissProgress } from "@/game/combo";
import { CONFIG } from "@/game/config";
import styles from "./ProgressBar.module.css";

interface Props {
  score: number;
  compact?: boolean;
}

/** Shared "progress toward the 10 BD threshold" bar — used live in the HUD
 * during a round and again on the result screen, so the target players are
 * chasing is never a mystery. Always shows the actual score/target numbers
 * next to the bar (not just an unlabeled line), plus tick marks with their
 * own numbers for the sticker/tech-kit tiers along the way. */
export default function ProgressBar({ score, compact }: Props) {
  const target = CONFIG.BD10_SCORE_THRESHOLD;
  // Same non-linear curve for the fill and the tier ticks so they stay aligned.
  const progress = nearMissProgress(score);
  const stickerAt = nearMissProgress(CONFIG.STICKER_SCORE_THRESHOLD);
  const kitAt = nearMissProgress(CONFIG.TECH_KIT_SCORE_THRESHOLD);

  return (
    <div className={compact ? styles.wrapCompact : styles.wrap}>
      <div className={styles.header}>
        <span className={styles.scoreNow}>{score}</span>
        <span className={styles.scoreTarget}>/ {target} for 10 BD</span>
      </div>

      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
        <div className={styles.tick} style={{ left: `${stickerAt * 100}%` }}>
          <span className={styles.tickLabel}>{CONFIG.STICKER_SCORE_THRESHOLD}</span>
        </div>
        <div className={styles.tick} style={{ left: `${kitAt * 100}%` }}>
          <span className={styles.tickLabel}>{CONFIG.TECH_KIT_SCORE_THRESHOLD}</span>
        </div>
      </div>

      {!compact && (
        <div className={styles.captionRow}>
          <span>🎟️ Sticker</span>
          <span>🎁 Tech kit</span>
          <span>🏆 10 BD</span>
        </div>
      )}
    </div>
  );
}
