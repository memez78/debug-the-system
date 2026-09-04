import type { LeaderboardEntry, ResultSubphase, RewardTier, RoundResult } from "@/game/types";
import NameEntry from "./NameEntry";
import ProgressBar from "./ProgressBar";
import styles from "./ResultOverlay.module.css";

interface Props {
  result: RoundResult;
  subphase: ResultSubphase;
  topScores: LeaderboardEntry[];
  onSubmitName: (name: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}

const TIER_MESSAGE: Record<RewardTier, string> = {
  bd10: "🏆 10 BD WINNER!",
  kit: "🎁 TECH KIT UNLOCKED!",
  sticker: "✅ STICKER EARNED!",
  none: "SO CLOSE — TRY AGAIN!",
};

const TIER_SUB: Record<RewardTier, string> = {
  bd10: "Go find a club member to claim your prize!",
  kit: "Show a club member this screen for your tech kit.",
  sticker: "Show a club member this screen for your sticker.",
  none: "Every debugger gets better with practice.",
};

export default function ResultOverlay({ result, subphase, topScores, onSubmitName, onSkip, onContinue }: Props) {
  return (
    <div className={styles.overlay}>
      {/* data-result-card lets the canvas engine locate this card and pose the
          celebrating mascot peeking up behind its top edge (see engine.ts). */}
      <div className={styles.card} data-result-card>
        <div className={styles.scoreLabel}>FINAL SCORE</div>
        <div className={styles.score}>{result.score}</div>

        <div className={styles.progressWrap}>
          <ProgressBar score={result.score} />
        </div>

        <div className={`${styles.tierMessage} ${styles[`tier-${result.tier}`]}`}>{TIER_MESSAGE[result.tier]}</div>
        <div className={styles.tierSub}>{TIER_SUB[result.tier]}</div>

        {subphase === "nameEntry" ? (
          <NameEntry
            onSubmit={onSubmitName}
            onSkip={onSkip}
            rank={topScores.filter((e) => e.score > result.score).length + 1}
          />
        ) : (
          <button type="button" className={styles.continueButton} onClick={onContinue}>
            TAP TO CONTINUE
          </button>
        )}
      </div>
    </div>
  );
}
