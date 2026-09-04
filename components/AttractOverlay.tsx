import { CONFIG } from "@/game/config";
import type { LeaderboardEntry, QuestionPhase } from "@/game/types";
import QuestionBanner from "./QuestionBanner";
import styles from "./AttractOverlay.module.css";

interface Props {
  topScores: LeaderboardEntry[];
  flashFact: string | null;
  questionText: string | null;
  questionPhase: QuestionPhase | null;
}

export default function AttractOverlay({ topScores, flashFact, questionText, questionPhase }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.top}>
        <h1 className={styles.title}>DEBUG THE SYSTEM</h1>
        <p className={styles.prizeLead}>CRACK THE SERVER · WIN</p>
        <p className={styles.prizeBig}>10 BD</p>
        <p className={styles.prizeSub}>Beat the viruses. Nobody has cracked it yet.</p>
      </div>

      {topScores.length > 0 && (
        <div className={styles.leaderboard}>
          <div className={styles.leaderboardTitle}>Top Debuggers Today</div>
          <ol className={styles.leaderboardList}>
            {topScores.slice(0, 5).map((entry, i) => (
              <li key={`${entry.name}-${entry.ts}`}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.name}>{entry.name}</span>
                <span className={styles.score}>{entry.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {questionText && (
        <div className={styles.demoBanner}>
          <QuestionBanner text={questionText} phase={questionPhase} compact />
        </div>
      )}

      {flashFact && <div className={styles.flashFact}>{flashFact}</div>}

      <div className={styles.bottom}>
        <p className={styles.cta}>TAP ANYWHERE TO PLAY</p>
        <p className={styles.ctaSub}>
          {Math.round(CONFIG.ROUND_LENGTH_SEC / 60)} minutes of IT questions · free to try
        </p>
      </div>
    </div>
  );
}
