import type { QuestionPhase } from "@/game/types";
import styles from "./QuestionBanner.module.css";

interface Props {
  text: string;
  phase: QuestionPhase | null;
  compact?: boolean;
}

export default function QuestionBanner({ text, phase, compact }: Props) {
  return (
    <div className={`${styles.banner} ${compact ? styles.compact : ""} ${phase === "reading" ? styles.reading : ""}`}>
      <span className={styles.tag}>DEBUG THIS</span>
      <span className={styles.text}>{text}</span>
    </div>
  );
}
