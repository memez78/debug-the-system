"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIG } from "@/game/config";
import styles from "./NameEntry.module.css";

interface Props {
  onSubmit: (name: string) => void;
  onSkip: () => void;
  rank: number;
}

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export default function NameEntry({ onSubmit, onSkip, rank }: Props) {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef("");
  const submittedRef = useRef(false);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  function doSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(nameRef.current);
  }

  // Mount-once physical-keyboard listener (reads/writes via refs and
  // functional setState so it never closes over stale name/submitted values).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (submittedRef.current) return;
      if (e.key === "Enter") {
        doSubmit();
      } else if (e.key === "Backspace") {
        setName((n) => n.slice(0, -1));
      } else if (/^[a-zA-Z0-9 ]$/.test(e.key)) {
        setName((n) => (n.length < CONFIG.NAME_MAX_LEN ? n + e.key.toUpperCase() : n));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pressKey(k: string) {
    setName((n) => (n.length < CONFIG.NAME_MAX_LEN ? n + k : n));
  }

  function backspace() {
    setName((n) => n.slice(0, -1));
  }

  const slots = Array.from({ length: CONFIG.NAME_MAX_LEN }, (_, i) => name[i] ?? "");

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        NEW TOP {Math.min(rank, CONFIG.LEADERBOARD_SIZE)} TODAY — ENTER YOUR NAME
      </div>

      <div className={styles.slots}>
        {slots.map((ch, i) => (
          <span key={i} className={`${styles.slot} ${i === name.length ? styles.slotActive : ""}`}>
            {ch || "_"}
          </span>
        ))}
      </div>

      <div className={styles.keyboard}>
        {KEY_ROWS.map((row, i) => (
          <div key={i} className={styles.keyRow}>
            {row.split("").map((k) => (
              <button key={k} type="button" className={styles.key} onClick={() => pressKey(k)} disabled={submitted}>
                {k}
              </button>
            ))}
          </div>
        ))}
        <div className={styles.keyRow}>
          <button
            type="button"
            className={`${styles.key} ${styles.keySpace}`}
            onClick={() => pressKey(" ")}
            disabled={submitted}
          >
            SPACE
          </button>
          <button type="button" className={styles.key} onClick={backspace} disabled={submitted}>
            DEL
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.skip} onClick={onSkip} disabled={submitted}>
          SKIP
        </button>
        <button type="button" className={styles.ok} onClick={doSubmit} disabled={submitted}>
          OK
        </button>
      </div>
    </div>
  );
}
