import type { ComboTier } from "@/game/combo";
import type { QuestionPhase } from "@/game/types";
import ProgressBar from "./ProgressBar";
import QuestionBanner from "./QuestionBanner";
import styles from "./HUDOverlay.module.css";

interface Props {
  score: number;
  combo: number;
  comboTier: ComboTier;
  timeLeftSec: number;
  urgent: boolean;
  flashFact: string | null;
  questionText: string | null;
  questionPhase: QuestionPhase | null;
}

export default function HUDOverlay({
  score,
  combo,
  comboTier,
  timeLeftSec,
  urgent,
  flashFact,
  questionText,
  questionPhase,
}: Props) {
  return (
    <div className={styles.overlay}>
      {questionText && (
        <div className={styles.bannerSlot}>
          <QuestionBanner text={questionText} phase={questionPhase} />
        </div>
      )}

      <div className={styles.topRow}>
        <div className={styles.stat}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.score}>{score}</span>
        </div>

        <div className={`${styles.timer} ${urgent ? styles.urgent : ""}`}>{timeLeftSec}</div>

        <div className={`${styles.stat} ${styles.comboStat}`}>
          <span className={styles.label}>STREAK</span>
          <span className={`${styles.combo} ${styles[`combo-${comboTier}`]}`}>x{combo}</span>
        </div>
      </div>

      <div className={styles.progressSlot}>
        <ProgressBar score={score} compact />
      </div>

      {flashFact && <div className={styles.flashFact}>{flashFact}</div>}
    </div>
  );
}
