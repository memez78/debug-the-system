import {
  drawAnswerBlock,
  randomCorrectFlashFact,
  randomWrongFlashFact,
  spawnAnswerBlocks,
  updateAnswerBlocks,
} from "./answerBlocks";
import { ParallaxBackground } from "./background";
import { CANVAS_FONT_STACK } from "./canvasFont";
import { Cinematic } from "./cinematic";
import { comboTier, comboTierColor, pointsForCombo } from "./combo";
import { ANSWER_BLOCK_FONT_PX, ANSWER_BLOCK_HEIGHT, CONFIG } from "./config";
import { getEscalation } from "./escalation";
import { Illusion } from "./illusion";
import { Mascot } from "./mascot";
import {
  drawFloatingTexts,
  drawParticles,
  spawnBurst,
  spawnFloatingText,
  updateFloatingTexts,
  updateParticles,
} from "./particles";
import { drawPrizeNote } from "./prizeNote";
import { backingScale, QualityGovernor, RENDER_QUALITY } from "./quality";
import { pickNextQuestion } from "./questions";
import { Sound } from "./sound";
import { addLeaderboardEntry, getTodaysLeaderboard, qualifiesForLeaderboard } from "./storage";
import type {
  AnswerBlock,
  EngineUiState,
  FloatingText,
  GamePhase,
  Particle,
  Question,
  QuestionPhase,
  RewardTier,
  RoundResult,
} from "./types";
import { clamp, clamp01 } from "./utils";

const MONO_FONT = CANVAS_FONT_STACK;
const ANSWER_FONT = `700 ${ANSWER_BLOCK_FONT_PX}px ${MONO_FONT}`;

function computeTier(score: number): RewardTier {
  if (score >= CONFIG.BD10_SCORE_THRESHOLD) return "bd10";
  if (score >= CONFIG.TECH_KIT_SCORE_THRESHOLD) return "kit";
  if (score >= CONFIG.STICKER_SCORE_THRESHOLD) return "sticker";
  return "none";
}

/**
 * Owns the whole game: state machine, rAF loop, canvas rendering, and
 * input. Runs imperatively outside React's render cycle for performance;
 * React only observes it through `subscribe`/`getSnapshot` (see
 * components/GameRoot.tsx) for the DOM overlay (score, timer, screens).
 *
 * Each round is a back-to-back sequence of question cycles: a fixed-read
 * banner, then 3-4 tappable answer options drift around the field until
 * one is tapped or every option times out, then a short pause and the
 * next question begins — repeating until the round's overall timer runs
 * out. Difficulty escalates with the correct-answer streak (see
 * game/escalation.ts), stacked on top of the existing elapsed-time ramp.
 */
export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rafId: number | null = null;
  private destroyed = false;

  private width = 0;
  private height = 0;
  private dpr = 1;

  /** Internal clock: only advances on visible frames, dt-clamped. Immune to
   * dropped frames, tab backgrounding, and system clock changes (§9). */
  private engineNow = 0;
  private lastRealTime = 0;

  private phase: GamePhase = "attract";
  private score = 0;
  private combo = 1;
  private roundStartAt = 0;
  private flashFact: string | null = null;
  private flashFactExpiresAt = 0;
  private result: RoundResult | null = null;
  private resultSubphase: "nameEntry" | "summary" = "summary";
  private autoReturnAt: number | null = null;
  /** True on the result screen only when the player reached a win tier
   * (sticker/kit/bd10) — drives the big card celebration; on a loss the
   * mascot is hidden rather than left sitting in a corner. */
  private resultWin = false;

  private currentQuestion: Question | null = null;
  private questionPhase: QuestionPhase = "reading";
  private readEndAt = 0;
  private nextQuestionAt: number | null = null;
  /** Wrong taps on the current question; at MAX_WRONG_TAPS_PER_QUESTION the
   * question auto-advances (see resolveAnswer). Reset each startQuestion. */
  private wrongTapsThisQuestion = 0;
  /** The mid-round cinematic fires once per round, when the player first
   * crosses the sticker threshold. */
  private interludePlayed = false;
  private interludeStartedAt = 0;
  private camoIntensity = 0;

  private demoActive = false;
  private demoReadEndAt = 0;
  private demoAutoCatchAt = 0;
  private nextPhantomAt = 0;

  private prizeNote: { x: number; y: number; phase: "drop" | "hold" | "fade"; phaseAt: number } | null = null;
  private nextPrizeNoteAt = 0;

  private shake = 0;

  /** Watches real frame times and drops the render tier if the device
   * cannot hold the budget. Purely cosmetic — see game/quality.ts. */
  private quality = new QualityGovernor();

  private answerBlocks: AnswerBlock[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private bg = new ParallaxBackground();
  private mascot = new Mascot();
  private sound = new Sound();
  /** Cinematic reports each new beat so audio can follow the script without
   * game/cinematic.ts needing to know that audio exists at all. */
  private cinematic = new Cinematic(({ hasCaption, sfx }) => {
    if (hasCaption) this.sound.caption();
    else this.sound.dialogue();
    if (sfx === "virus") this.sound.virusScreech();
    else if (sfx === "impact") this.sound.impact();
  });
  /** Whole second the urgent countdown last beeped on, so the tick fires
   * once per second rather than once per frame. */
  private lastUrgentTickSec = -1;
  private illusion = new Illusion();
  /** 0-1 ramp of the "illusion" pressure, driven by score past the tech-kit
   * threshold. Purely atmospheric — never affects scoring or hit-testing. */
  private illusionIntensity = 0;
  /** The virus screech announcing the illusion fires once per round, on the
   * frame the pressure first becomes non-zero. */
  private illusionAnnounced = false;
  /** Result computed at round end, held while the outro plays. */
  private pendingResult: RoundResult | null = null;

  private uiState: EngineUiState;
  private listeners = new Set<() => void>();

  constructor() {
    this.uiState = {
      phase: "attract",
      canvasReady: false,
      score: 0,
      combo: 1,
      comboTier: "green",
      timeLeftSec: CONFIG.ROUND_LENGTH_SEC,
      urgent: false,
      topScoresToday: getTodaysLeaderboard(),
      result: null,
      resultSubphase: "summary",
      flashFact: null,
      questionPhase: null,
      questionText: null,
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): EngineUiState => this.uiState;

  private publish(patch: Partial<EngineUiState>): void {
    let changed = false;
    for (const key in patch) {
      const k = key as keyof EngineUiState;
      if (!Object.is(this.uiState[k], patch[k])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.uiState = { ...this.uiState, ...patch };
    for (const l of this.listeners) l();
  }

  attach(canvas: HTMLCanvasElement): void {
    this.destroyed = false;
    this.canvas = canvas;
    // `alpha: false` lets the compositor skip per-pixel blending of the
    // whole canvas against the page behind it — a real saving at phone
    // resolutions. It is safe because every frame paints the full surface:
    // the normal path opens with ParallaxBackground.draw and the cinematic
    // path with its own full-screen backdrop fill.
    this.ctx = canvas.getContext("2d", { alpha: false });
    if (!this.ctx) return;

    // Before the first resize, so the backing store is sized from the tier
    // this device is starting on.
    this.quality.start();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas);
    this.handleResize();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("keydown", this.onKeyDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.nextPhantomAt = CONFIG.PHANTOM_DEMO_INTERVAL_MS * 0.4;
    this.nextPrizeNoteAt = CONFIG.PRIZE_NOTE_INTERVAL_MS * 0.3;
    this.lastRealTime = performance.now();
    this.publish({ canvasReady: true, topScoresToday: getTodaysLeaderboard() });
    this.rafId = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas?.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private handleResize(): void {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = backingScale();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.dpr = dpr;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bg.resize(this.width, this.height);
    this.mascot.setStation(this.width / 2, this.height - 78);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Booth staff mute. Ignored while a name is being typed on the result
    // screen, where "m" is just a letter.
    if (e.key !== "m" && e.key !== "M") return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    this.sound.toggleMute();
  };

  private onVisibilityChange = (): void => {
    if (!document.hidden) {
      this.lastRealTime = performance.now();
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.canvas) return;
    // Browsers keep an AudioContext silent until a real gesture; this is it.
    this.sound.unlock();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.setMascotTarget(x, y);

    if (this.phase === "attract") {
      this.startIntro();
      return;
    }
    if (this.phase === "intro" || this.phase === "interlude" || this.phase === "outro") {
      // A tap moves the story on one line rather than skipping the whole
      // sequence, so a fast reader sets their own pace instead of choosing
      // between sitting through it and missing it entirely.
      this.cinematic.advance(this.engineNow);
      return;
    }
    if (this.phase === "playing") {
      this.handleTap(x, y);
      return;
    }
    if (this.phase === "result" && this.resultSubphase === "summary") {
      this.returnToAttract();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.setMascotTarget(e.clientX - rect.left, e.clientY - rect.top);
  };

  /** The mascot flies to wherever the player last pointed/touched, clamped
   * to a band that keeps its full sprite (and thruster flame) on-screen and
   * clear of the question banner up top. */
  private setMascotTarget(x: number, y: number): void {
    const marginX = 70;
    const topMargin = 195;
    const bottomMargin = 20;
    this.mascot.setTarget(clamp(x, marginX, this.width - marginX), clamp(y, topMargin, this.height - bottomMargin));
  }

  private handleTap(x: number, y: number): void {
    if (this.questionPhase === "answering") {
      for (let i = this.answerBlocks.length - 1; i >= 0; i--) {
        const b = this.answerBlocks[i];
        const halfW = (b.width / 2) * 1.05;
        const halfH = (ANSWER_BLOCK_HEIGHT / 2) * 1.15;
        if (Math.abs(x - b.x) <= halfW && Math.abs(y - b.y) <= halfH) {
          this.answerBlocks.splice(i, 1);
          this.resolveAnswer(b, this.engineNow, true);
          return;
        }
      }
    }
    // tiny cosmetic feedback for a genuine miss-tap so the kiosk always feels responsive
    spawnBurst(this.particles, x, y, "rgba(150, 200, 220, 0.5)", 3);
  }

  private resolveAnswer(b: AnswerBlock, now: number, scoreCounts: boolean): void {
    if (!b.isCorrect) {
      this.combo = 1;
      this.score = Math.max(0, this.score - CONFIG.WRONG_ANSWER_PENALTY);
      this.mascot.trigger("flinch", 0.32);
      spawnFloatingText(this.floatingTexts, b.x, b.y, `-${CONFIG.WRONG_ANSWER_PENALTY}`, "#ff5a5a", 22);
      spawnBurst(this.particles, b.x, b.y, "#ffb020", 10);
      this.setFlashFact(randomWrongFlashFact(), now);
      this.shake = Math.max(this.shake, 4);
      if (scoreCounts) this.sound.wrong();
      // After enough wrong taps, abandon the question so it can't be brute-
      // forced by elimination — clearing the blocks makes updatePlaying
      // schedule the next question, exactly like a timeout (combo already 0).
      if (scoreCounts) {
        this.wrongTapsThisQuestion += 1;
        if (this.wrongTapsThisQuestion >= CONFIG.MAX_WRONG_TAPS_PER_QUESTION) {
          this.answerBlocks = [];
          this.setFlashFact("QUESTION FAILED", now);
          this.sound.questionFailed();
        }
      }
      return;
    }

    if (scoreCounts) {
      this.combo = Math.min(this.combo + 1, CONFIG.MAX_COMBO);
      const points = pointsForCombo(this.combo);
      this.score += points;
      const tier = comboTier(this.combo);
      const color = comboTierColor(tier);
      this.sound.correct(this.combo - 1);
      spawnFloatingText(this.floatingTexts, b.x, b.y, `+${points}`, color, 24);
      spawnBurst(this.particles, b.x, b.y, color, 16 + this.combo);
      this.setFlashFact(randomCorrectFlashFact(), now);
      this.shake = Math.max(this.shake, tier === "white" ? 10 : tier === "gold" ? 6 : 3);
      if (this.combo > 0 && this.combo % 5 === 0) {
        this.mascot.trigger("celebrate", 0.55);
      } else {
        this.mascot.trigger("reach", 0.3, b.x, b.y);
      }
    } else {
      // phantom demo auto-catch: same teaching visuals, no score/streak effect
      spawnFloatingText(this.floatingTexts, b.x, b.y, "+10", "#2effc7", 22);
      spawnBurst(this.particles, b.x, b.y, "#2effc7", 16);
      this.setFlashFact(randomCorrectFlashFact(), now);
      this.mascot.trigger("reach", 0.3, b.x, b.y);
    }
    // a correct tap resolves the whole question — clear any other live options
    this.answerBlocks = [];
  }

  private setFlashFact(text: string, now: number): void {
    this.flashFact = text;
    this.flashFactExpiresAt = now + 1500;
  }

  /**
   * Vertical band the answer blocks may occupy.
   *
   * During play the top of the screen is a solid stack of DOM UI — question
   * banner, score/timer/streak row, then the progress bar — so blocks have
   * to start well below it or they drift under the timer. On the attract
   * screen the whole upper half is the headline + big 10 BD, so the demo
   * runs strictly in the lower half.
   */
  private fieldBounds(): { top: number; bottom: number } {
    // Attract is crowded (title + big 10 BD on top, CTA at the bottom), so
    // the demo gets a narrow strip low down; in-round the whole HUD stack
    // has to be cleared instead.
    const attract = this.phase === "attract";
    // Attract stacks title → 10 BD → subtitle → demo banner in flow, so the
    // demo's answers have to start below all of it.
    let bottom = attract ? Math.max(100, this.height * 0.15) : Math.max(190, this.height * 0.2);
    let top = attract ? Math.max(300, this.height * 0.68) : Math.max(330, this.height * 0.34);
    // On a short window the reserved bands could swallow the whole field —
    // scale them back so there's always a usable strip left to play in.
    const maxReserved = this.height * 0.78;
    if (top + bottom > maxReserved) {
      const scale = maxReserved / (top + bottom);
      top *= scale;
      bottom *= scale;
    }
    return { top, bottom };
  }

  private roundProgress(now: number): number {
    return clamp01((now - this.roundStartAt) / (CONFIG.ROUND_LENGTH_SEC * 1000));
  }

  /** attract → intro cinematic. Gameplay starts when it finishes/skips. */
  startIntro(): void {
    if (this.phase === "intro" || this.phase === "playing") return;
    this.phase = "intro";
    this.answerBlocks = [];
    this.currentQuestion = null;
    this.prizeNote = null;
    this.cinematic.start("intro", this.engineNow);
    this.publish({
      phase: "intro",
      flashFact: null,
      questionPhase: null,
      questionText: null,
      result: null,
    });
  }

  beginRound(): void {
    if (this.phase === "playing") return;
    this.phase = "playing";
    this.score = 0;
    this.combo = 1;
    this.answerBlocks = [];
    this.particles = [];
    this.floatingTexts = [];
    this.flashFact = null;
    this.result = null;
    // A round can end mid-pause (timer expiry between two questions), which
    // would otherwise leave a timestamp from the previous round sitting here
    // and make the new round skip its own first question on frame one.
    this.nextQuestionAt = null;
    this.roundStartAt = this.engineNow;
    this.illusionIntensity = 0;
    this.illusionAnnounced = false;
    this.illusion.reset();
    this.interludePlayed = false;
    this.lastUrgentTickSec = -1;
    // Neither of these can appear for a while yet, and together they are
    // most of the game's image weight — so they are fetched here rather
    // than at page load, where they would only slow the first paint on a
    // phone. Starting now gives them the length of the round to arrive.
    this.illusion.preload();
    this.cinematic.preloadOutroArt();
    this.mascot.setPanicking(false);
    this.sound.roundStart();
    this.startQuestion(this.engineNow);
    this.publish({
      phase: "playing",
      score: 0,
      combo: 1,
      comboTier: "green",
      timeLeftSec: CONFIG.ROUND_LENGTH_SEC,
      urgent: false,
      flashFact: null,
      result: null,
      questionPhase: this.questionPhase,
      questionText: this.currentQuestion?.question ?? null,
    });
  }

  /** Mid-round cutscene. The round clock is paused for its duration (the
   * start time is pushed forward on resume) so the cinematic never eats
   * into a player's answering time. */
  private startInterlude(now: number): void {
    this.interludePlayed = true;
    this.interludeStartedAt = now;
    this.phase = "interlude";
    this.answerBlocks = [];
    this.nextQuestionAt = null;
    this.cinematic.start("interlude", now);
    this.sound.interlude();
    this.publish({
      phase: "interlude",
      flashFact: null,
      questionPhase: null,
      questionText: null,
    });
  }

  private finishInterlude(now: number): void {
    // give back exactly the time the cutscene took
    this.roundStartAt += now - this.interludeStartedAt;
    this.phase = "playing";
    this.startQuestion(now);
    this.publish({
      phase: "playing",
      questionPhase: this.questionPhase,
      questionText: this.currentQuestion?.question ?? null,
    });
  }

  private startQuestion(now: number): void {
    this.currentQuestion = pickNextQuestion();
    this.questionPhase = "reading";
    this.readEndAt = now + CONFIG.QUESTION_READ_MS;
    this.answerBlocks = [];
    this.wrongTapsThisQuestion = 0;
  }

  /** Round timer expired: the result is computed here exactly as before, but
   * held while the outro cinematic plays. The results screen itself (and all
   * leaderboard logic) is unchanged — just deferred by a few seconds. */
  private endRound(now: number): void {
    this.answerBlocks = [];
    this.currentQuestion = null;
    this.mascot.setPanicking(false);
    const tier = computeTier(this.score);
    const qualifies = qualifiesForLeaderboard(this.score);
    this.pendingResult = { score: this.score, tier, qualifiesForLeaderboard: qualifies };
    this.resultWin = tier !== "none";

    this.phase = "outro";
    // Only cracking the 10 BD threshold earns the "breach the server" ending;
    // every other outcome ends with the robot lost to the void.
    this.cinematic.start(tier === "bd10" ? "outroWin" : "outroLoss", now);
    if (tier === "bd10") this.sound.win();
    else this.sound.lose();
    this.publish({
      phase: "outro",
      flashFact: null,
      questionPhase: null,
      questionText: null,
    });
  }

  /** Outro finished/skipped → hand off to the existing results screen. */
  private finishOutro(now: number): void {
    const result = this.pendingResult;
    if (!result) {
      this.returnToAttract();
      return;
    }
    this.pendingResult = null;
    this.phase = "result";
    this.result = result;
    this.resultSubphase = result.qualifiesForLeaderboard ? "nameEntry" : "summary";
    this.autoReturnAt = result.qualifiesForLeaderboard ? null : now + CONFIG.RESULT_AUTO_RETURN_MS;
    this.publish({
      phase: "result",
      result: this.result,
      resultSubphase: this.resultSubphase,
      questionPhase: null,
      questionText: null,
    });
  }

  submitName(rawName: string): void {
    if (!this.result) return;
    const updated = addLeaderboardEntry(rawName, this.result.score);
    this.resultSubphase = "summary";
    this.autoReturnAt = this.engineNow + CONFIG.RESULT_AUTO_RETURN_MS;
    this.publish({ resultSubphase: "summary", topScoresToday: updated });
  }

  skipNameEntry(): void {
    this.resultSubphase = "summary";
    this.autoReturnAt = this.engineNow + CONFIG.RESULT_AUTO_RETURN_MS;
    this.publish({ resultSubphase: "summary" });
  }

  returnToAttract(): void {
    this.phase = "attract";
    this.answerBlocks = [];
    this.currentQuestion = null;
    this.result = null;
    this.autoReturnAt = null;
    this.demoActive = false;
    this.nextPhantomAt = this.engineNow + CONFIG.PHANTOM_DEMO_INTERVAL_MS * 0.5;
    this.publish({
      phase: "attract",
      result: null,
      flashFact: null,
      topScoresToday: getTodaysLeaderboard(),
      questionPhase: null,
      questionText: null,
    });
  }

  private updatePlaying(now: number, dtSec: number): void {
    const timeLeftMs = CONFIG.ROUND_LENGTH_SEC * 1000 - (now - this.roundStartAt);
    if (timeLeftMs <= 0) {
      this.endRound(now);
      return;
    }
    // Hitting the prize ends the round then and there. The attract screen
    // and the progress bar both promise "<threshold> for 10 BD", so play has
    // to stop the moment that is true — otherwise the number is not a target,
    // it is just a line the score wanders past.
    if (this.score >= CONFIG.BD10_SCORE_THRESHOLD) {
      this.endRound(now);
      return;
    }

    const urgent = timeLeftMs <= CONFIG.URGENT_TIME_SEC * 1000;
    this.mascot.setPanicking(urgent);
    const secLeft = Math.ceil(timeLeftMs / 1000);
    if (urgent && secLeft !== this.lastUrgentTickSec) {
      this.lastUrgentTickSec = secLeft;
      this.sound.urgentTick();
    }

    // First time they bank a sticker, cut to the mid-round scene.
    if (!this.interludePlayed && this.score >= CONFIG.STICKER_SCORE_THRESHOLD) {
      this.startInterlude(now);
      return;
    }

    const streak = Math.max(0, this.combo - 1);
    const t = this.roundProgress(now);
    const esc = getEscalation(streak, t);
    this.camoIntensity = esc.camoIntensity;

    // Illusion pressure ramps in once they cross the tech-kit threshold and
    // maxes out a few hundred points later.
    const illusionStart = CONFIG.TECH_KIT_SCORE_THRESHOLD;
    const illusionFull = CONFIG.TECH_KIT_SCORE_THRESHOLD * 3;
    this.illusionIntensity = clamp01((this.score - illusionStart) / (illusionFull - illusionStart));
    this.illusion.update(dtSec, this.illusionIntensity, this.width, this.height);
    if (!this.illusionAnnounced && this.illusionIntensity > 0) {
      this.illusionAnnounced = true;
      this.sound.virusScreech();
    }

    if (this.questionPhase === "reading") {
      if (now >= this.readEndAt && this.currentQuestion && this.ctx) {
        this.answerBlocks = spawnAnswerBlocks(
          this.ctx,
          this.currentQuestion,
          esc.answerCount,
          esc.windowMs,
          esc.driftSpeed,
          now,
          ANSWER_FONT,
          this.width,
          this.height,
          this.fieldBounds(),
        );
        this.questionPhase = "answering";
        this.sound.answersUp();
      }
    } else {
      updateAnswerBlocks(this.answerBlocks, dtSec, this.width, this.height, this.fieldBounds());
      let anyExpired = false;
      for (let i = this.answerBlocks.length - 1; i >= 0; i--) {
        if (now >= this.answerBlocks[i].expiresAt) {
          anyExpired = true;
          this.answerBlocks.splice(i, 1);
        }
      }
      if (anyExpired) {
        this.combo = 1;
        this.sound.timeout();
      }
      if (this.answerBlocks.length === 0 && this.nextQuestionAt === null) {
        this.nextQuestionAt = now + CONFIG.QUESTION_RESOLVE_PAUSE_MS;
      }
    }

    if (this.nextQuestionAt !== null && now >= this.nextQuestionAt) {
      this.nextQuestionAt = null;
      this.startQuestion(now);
    }

    if (this.flashFact && now >= this.flashFactExpiresAt) {
      this.flashFact = null;
    }

    const tier = comboTier(this.combo);
    this.publish({
      score: this.score,
      combo: this.combo,
      comboTier: tier,
      timeLeftSec: Math.ceil(timeLeftMs / 1000),
      urgent,
      flashFact: this.flashFact,
      questionPhase: this.questionPhase,
      questionText: this.currentQuestion?.question ?? null,
    });
  }

  private updateAttract(now: number, dtSec: number): void {
    if (!this.demoActive && now >= this.nextPhantomAt) {
      this.currentQuestion = pickNextQuestion();
      this.questionPhase = "reading";
      this.demoActive = true;
      this.demoReadEndAt = now + CONFIG.PHANTOM_DEMO_READ_MS;
      this.answerBlocks = [];
    }

    if (this.demoActive) {
      if (this.questionPhase === "reading" && now >= this.demoReadEndAt) {
        if (this.currentQuestion && this.ctx) {
          this.answerBlocks = spawnAnswerBlocks(
            this.ctx,
            this.currentQuestion,
            CONFIG.ANSWER_COUNT_BASE,
            CONFIG.PHANTOM_DEMO_WINDOW_MS,
            CONFIG.ANSWER_DRIFT_SPEED_START,
            now,
            ANSWER_FONT,
            this.width,
            this.height,
            this.fieldBounds(),
          );
        }
        this.questionPhase = "answering";
        this.demoAutoCatchAt = now + CONFIG.PHANTOM_DEMO_WINDOW_MS * CONFIG.PHANTOM_DEMO_AUTO_CATCH_FRACTION;
      } else if (this.questionPhase === "answering") {
        updateAnswerBlocks(this.answerBlocks, dtSec, this.width, this.height, this.fieldBounds());
        if (now >= this.demoAutoCatchAt) {
          const correct = this.answerBlocks.find((b) => b.isCorrect);
          if (correct) this.resolveAnswer(correct, now, false);
          this.answerBlocks = [];
          this.currentQuestion = null;
          this.demoActive = false;
          this.nextPhantomAt = now + CONFIG.PHANTOM_DEMO_INTERVAL_MS;
        }
      }
    }

    this.updatePrizeNote(now);

    if (this.flashFact && now >= this.flashFactExpiresAt) {
      this.flashFact = null;
    }
    this.publish({
      flashFact: this.flashFact,
      questionPhase: this.demoActive ? this.questionPhase : null,
      questionText: this.demoActive ? (this.currentQuestion?.question ?? null) : null,
    });
  }

  private updatePrizeNote(now: number): void {
    // The note and the teaching demo never share the screen — attract is
    // already busy with the title, the big 10 BD and the CTA. If the demo
    // starts while a note is up, retire the note early (NOT by bailing out
    // of this method, or it would freeze mid-animation and never clear).
    if (this.demoActive && this.prizeNote && this.prizeNote.phase !== "fade") {
      this.prizeNote.phase = "fade";
      this.prizeNote.phaseAt = now;
    }
    if (!this.prizeNote && !this.demoActive && now >= this.nextPrizeNoteAt) {
      const leftSide = Math.random() < 0.5;
      this.prizeNote = {
        x: this.width * (leftSide ? 0.16 + Math.random() * 0.12 : 0.72 + Math.random() * 0.12),
        y: this.height * (0.6 + Math.random() * 0.14),
        phase: "drop",
        phaseAt: now,
      };
    }
    const note = this.prizeNote;
    if (!note) return;
    const elapsed = now - note.phaseAt;
    if (note.phase === "drop" && elapsed >= CONFIG.PRIZE_NOTE_DROP_MS) {
      note.phase = "hold";
      note.phaseAt = now;
    } else if (note.phase === "hold" && elapsed >= CONFIG.PRIZE_NOTE_HOLD_MS) {
      note.phase = "fade";
      note.phaseAt = now;
    } else if (note.phase === "fade" && elapsed >= CONFIG.PRIZE_NOTE_FADE_MS) {
      this.prizeNote = null;
      this.nextPrizeNoteAt = now + CONFIG.PRIZE_NOTE_INTERVAL_MS;
    }
  }

  private updateResult(now: number): void {
    if (this.resultSubphase === "summary" && this.autoReturnAt !== null && now >= this.autoReturnAt) {
      this.returnToAttract();
    }
  }

  private frame = (rt: number): void => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.frame);

    const realDt = rt - this.lastRealTime;
    this.lastRealTime = rt;
    if (document.hidden || !this.ctx) return;

    const dtMs = Math.min(Math.max(realDt, 0), CONFIG.MAX_FRAME_DT_MS);
    const dtSec = dtMs / 1000;
    this.engineNow += dtMs;
    const now = this.engineNow;

    this.bg.update(dtSec);
    this.mascot.update(dtSec);
    this.updateAmbientAudio();
    updateParticles(this.particles, dtSec);
    updateFloatingTexts(this.floatingTexts, dtSec);
    this.shake *= Math.max(0, 1 - dtSec * 6);
    if (this.shake < 0.05) this.shake = 0;

    if (this.phase === "playing") this.updatePlaying(now, dtSec);
    else if (this.phase === "attract") this.updateAttract(now, dtSec);
    else if (this.phase === "intro" || this.phase === "interlude" || this.phase === "outro") {
      // A cinematic holds on each line until the player taps; update() is
      // only the abandoned-kiosk safety net that eventually moves it on.
      this.cinematic.update(now);
      if (this.cinematic.isDone()) {
        if (this.phase === "intro") this.beginRound();
        else if (this.phase === "interlude") this.finishInterlude(now);
        else this.finishOutro(now);
      }
    } else this.updateResult(now);

    this.render(now);

    // Measured on the real elapsed time, not the clamped engine delta — the
    // whole point is to notice frames that ran long. A tier change resizes
    // the backing store, so the canvas has to be rebuilt to match.
    if (this.quality.sample(realDt)) this.handleResize();
  };

  /**
   * Drives the three continuous audio layers. They are set here, once per
   * frame from the one place that can see every input they depend on, rather
   * than being poked from each of the transitions that happen to change them
   * — which is how a layer ends up stuck on after a phase change.
   */
  private updateAmbientAudio(): void {
    this.sound.updateMusic(this.musicLevelForPhase());
    // The thruster only roars where the flame is actually drawn: the mascot
    // is hidden on the result screen and drawn by the cinematics themselves.
    const flying = this.phase === "attract" || this.phase === "playing";
    this.sound.setThrust(flying ? this.mascot.flameIntensity : 0);
    // Dread tracks the illusion, which only exists mid-round.
    this.sound.setDread(this.phase === "playing" ? this.illusionIntensity : 0);
  }

  private musicLevelForPhase(): number {
    switch (this.phase) {
      case "attract":
        return CONFIG.SOUND_MUSIC_LEVEL_ATTRACT;
      case "playing":
        return CONFIG.SOUND_MUSIC_LEVEL_PLAYING;
      case "result":
        return CONFIG.SOUND_MUSIC_LEVEL_RESULT;
      default:
        return CONFIG.SOUND_MUSIC_LEVEL_CINEMATIC;
    }
  }

  private render(now: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Cinematics own the whole frame — they draw their own backdrop.
    if (this.phase === "intro" || this.phase === "interlude" || this.phase === "outro") {
      this.cinematic.render(ctx, now, this.width, this.height, this.mascot);
      return;
    }

    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this.bg.draw(ctx, MONO_FONT);

    // Illusion atmosphere sits behind the answer blocks so the question and
    // its options stay fully readable no matter how chaotic it gets.
    if (this.phase === "playing") {
      this.illusion.drawBehind(ctx, this.illusionIntensity, this.width, this.height);
    }

    if (this.phase === "attract" && this.prizeNote) {
      const note = this.prizeNote;
      const elapsed = now - note.phaseAt;
      const dropT = note.phase === "drop" ? elapsed / CONFIG.PRIZE_NOTE_DROP_MS : 1;
      const alpha = note.phase === "fade" ? 1 - clamp01(elapsed / CONFIG.PRIZE_NOTE_FADE_MS) : 1;
      drawPrizeNote(ctx, note.x, note.y, dropT, alpha, this.mascot.idleClock);
    }

    if (this.answerBlocks.length > 0 && this.currentQuestion) {
      const camo = this.phase === "playing" ? this.camoIntensity : 0;
      // Setting ctx.filter makes the browser render every following draw
      // call into a scratch surface and blur it — roughly eight of them per
      // block, four blocks, every frame. It is by far the most expensive
      // thing in this renderer and the first thing the low tier gives up.
      // The other four camouflage effects (flicker, jitter, chromatic
      // ghosting, wobble) are unaffected and still escalate with the streak.
      const blurred = camo > 0 && RENDER_QUALITY.canvasBlur;
      if (blurred) {
        ctx.save();
        ctx.filter = `blur(${(camo * CONFIG.ESCALATION_BLUR_MAX_PX).toFixed(2)}px)`;
      }
      for (const b of this.answerBlocks) {
        drawAnswerBlock(ctx, b, now, camo, ANSWER_FONT);
      }
      if (blurred) ctx.restore();
    }

    if (this.phase === "playing") {
      this.illusion.drawFront(ctx, this.illusionIntensity, this.width, this.height);
    }

    drawParticles(ctx, this.particles);
    if (this.phase === "result") {
      // On a win, pose the mascot celebrating, peeking up behind the top edge
      // of the results card. On a loss, don't draw it at all (avoids a small
      // static robot stranded in a corner).
      if (this.resultWin) this.drawResultCelebration(ctx);
    } else {
      this.mascot.draw(ctx);
    }
    drawFloatingTexts(ctx, this.floatingTexts);

    ctx.restore();
  }

  /** Locates the DOM results card and poses the celebrating mascot so it
   * peeks up from behind the card's top edge, centered on it. Falls back to
   * an upper-center position if the card isn't mounted yet (first frame). */
  private drawResultCelebration(ctx: CanvasRenderingContext2D): void {
    const displayHeight = Math.min(220, this.height * 0.34);
    let centerX = this.width / 2;
    let topEdgeY = this.height * 0.28;

    const card = this.canvas?.ownerDocument.querySelector<HTMLElement>("[data-result-card]");
    if (card && this.canvas) {
      const cardRect = card.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();
      centerX = cardRect.left + cardRect.width / 2 - canvasRect.left;
      topEdgeY = cardRect.top - canvasRect.top;
    }

    // Feet sit just inside the card's top edge so the lower legs tuck behind
    // it (slight overlap) while the head, arms and torso rise clearly above.
    // If that would push the head off the top of the screen (very tall cards,
    // e.g. name-entry), drop it down so the whole upper body stays visible.
    let feetY = topEdgeY + displayHeight * 0.34;
    const minFeetY = 10 + displayHeight;
    if (feetY < minFeetY) feetY = minFeetY;
    this.mascot.drawCelebration(ctx, centerX, feetY, displayHeight);
  }
}
