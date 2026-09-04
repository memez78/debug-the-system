import styles from "./FallbackMessage.module.css";

export default function FallbackMessage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>DEBUG THE SYSTEM</h1>
        <p>This browser doesn&apos;t support the canvas rendering this game needs.</p>
        <p>Please open this page in a recent version of Chrome, Edge, or Firefox.</p>
      </div>
    </div>
  );
}
