"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GameEngine } from "@/game/engine";
import AttractOverlay from "./AttractOverlay";
import FallbackMessage from "./FallbackMessage";
import styles from "./GameRoot.module.css";
import HUDOverlay from "./HUDOverlay";
import ResultOverlay from "./ResultOverlay";

function detectSupport(): boolean {
  const hasCanvas = !!document.createElement("canvas").getContext?.("2d");
  const hasRaf = typeof window.requestAnimationFrame === "function";
  return hasCanvas && hasRaf;
}

export default function GameRoot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine] = useState(() => new GameEngine());
  const [supported] = useState(detectSupport);

  useEffect(() => {
    if (!supported) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.attach(canvas);
    // Dev-only handle so the engine can be inspected/driven from the console
    // during manual testing. Never present in a production build.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __engine?: GameEngine }).__engine = engine;
    }
    return () => engine.destroy();
  }, [engine, supported]);

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  if (!supported) return <FallbackMessage />;

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {state.phase === "attract" && (
        <AttractOverlay
          topScores={state.topScoresToday}
          flashFact={state.flashFact}
          questionText={state.questionText}
          questionPhase={state.questionPhase}
        />
      )}

      {state.phase === "playing" && (
        <HUDOverlay
          score={state.score}
          combo={state.combo}
          comboTier={state.comboTier}
          timeLeftSec={state.timeLeftSec}
          urgent={state.urgent}
          flashFact={state.flashFact}
          questionText={state.questionText}
          questionPhase={state.questionPhase}
        />
      )}

      {state.phase === "result" && state.result && (
        <ResultOverlay
          result={state.result}
          subphase={state.resultSubphase}
          topScores={state.topScoresToday}
          onSubmitName={(name) => engine.submitName(name)}
          onSkip={() => engine.skipNameEntry()}
          onContinue={() => engine.returnToAttract()}
        />
      )}
    </div>
  );
}
