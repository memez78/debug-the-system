import { CANVAS_FONT_STACK } from "./canvasFont";
import type { Mascot, SpriteKey } from "./mascot";
import { clamp01, lerp } from "./utils";

/**
 * Intro / interlude / outro cinematic layer. Purely presentational — it
 * wraps the round-start, mid-round and round-end events and never touches
 * scoring, difficulty, the question mechanic, the leaderboard or tiers.
 *
 *   attract --tap--> INTRO --> playing --(sticker)--> INTERLUDE --> playing
 *                                      --round ends--> OUTRO --> result
 *
 * Each sequence is a list of timed beats. A beat can change the framing
 * (wide establishing shot vs. close-up on the robot), show a caption, and
 * give the robot a line of dialogue. Everything is tap-skippable.
 *
 * Art: user-supplied illustrated PNGs in /public/cinematic, styled to match
 * the robot mascot. The robot is drawn with the real mascot sprites so it's
 * identical to the one in gameplay.
 */

export type CinematicMode = "intro" | "interlude" | "outroWin" | "outroLoss";

/**
 * Beat timings, in seconds from the start of each sequence. The renderers
 * and the dialogue script both read these, so a shot change can never drift
 * out of sync with the line that's meant to be on screen during it.
 *
 * These set how quickly each shot plays out, not how long it stays up. Once
 * a beat reaches its mark the picture holds and waits for a tap, so a slow
 * reader is never rushed and a fast one is never stuck.
 */
const T = {
  intro: { closeUpIn: 3.2, closeUpOut: 9.6, viruses: 12.6, end: 17 },
  interlude: { ring: 2.2, swarm: 4.4, end: 7.4 },
  win: { blast: 2.4, ashes: 3.6, money: 5.6, end: 11.5 },
  loss: { lunge: 2.4, fall: 5, end: 10.5 },
} as const;

const SRC = {
  moon: "/cinematic/moon.png",
  server: "/cinematic/server.png",
  serverBlast: "/cinematic/server_broken_blast.png",
  serverAshes: "/cinematic/server_broken_ashes.png",
  serverMoney: "/cinematic/server_broken_money.png",
  virusGreen: "/cinematic/virus_green.png",
  virusGreenOpen: "/cinematic/virus_green_mouth_open.png",
  virusRed: "/cinematic/virus_red.png",
  virusRedOpen: "/cinematic/virus_red._mouth_open.png",
} as const;

type ImgKey = keyof typeof SRC;

/**
 * A one-shot sound tied to what a beat actually shows on screen.
 */
export type BeatSfx = "virus" | "impact";

/**
 * A story beat: one line of dialogue and the shot that goes with it.
 *
 * `until` is a position on the sequence timeline, in seconds, marking where
 * this beat's animation finishes. It is NOT how long the beat stays on
 * screen — a beat animates up to `until` and then holds there indefinitely,
 * waiting for the player to tap. So `until` sets how *fast* a shot plays,
 * never how long the player gets to read.
 */
interface Beat {
  until: number;
  caption?: string;
  line?: string;
  /** Fired once when this beat comes up. Declared here, next to the shot it
   * belongs to, so the audio can never drift out of step with the picture. */
  sfx?: BeatSfx;
}

/**
 * UNIT-01 is a maintenance robot, not a narrator. It has done this job a
 * hundred times, it is tired, and it is funnier than it means to be. Keep
 * the lines short, keep the contractions, and let it trail off or cut itself
 * off — clean, complete, evenly-weighted sentences are what makes dialogue
 * read as filler.
 */
const SCRIPT: Record<CinematicMode, Beat[]> = {
  intro: [
    { until: T.intro.closeUpIn, caption: "SYSTEM COMPROMISED", line: "Right. The whole campus server is down. Again." },
    { until: 6.4, line: "Name's UNIT-01. Maintenance. Nobody calls me with good news." },
    { until: T.intro.closeUpOut, line: "Whatever got in chewed through six firewalls and ran for the moon." },
    { until: T.intro.viruses, line: "So that's where we're going. Try to keep up." },
    { until: 14.9, caption: "INFECTION DETECTED", line: "...Oh good. It brought friends.", sfx: "virus" },
    { until: T.intro.end, line: "I can't out-think these things alone. You answer, I punch. Go." },
  ],
  interlude: [
    { until: T.interlude.ring, caption: "FIREWALL LAYER BREACHED", line: "Layer one's down. Okay. You're actually good at this." },
    { until: T.interlude.swarm, line: "Take a sticker. I'd give you a medal, but you've seen our budget." },
    { until: T.interlude.end, line: "Don't get comfortable. They know we're in here now.", sfx: "virus" },
  ],
  outroWin: [
    { until: T.win.blast, line: "Core's wide open. Going in — cover me!" },
    { until: T.win.ashes, sfx: "impact" },
    { until: T.win.money, line: "......Huh." },
    { until: 8.6, caption: "10 BD RETRIEVED", line: "Ten dinars. That was sitting in there the whole time." },
    { until: T.win.end, line: "Take it. Go. Before somebody files this as an incident." },
  ],
  outroLoss: [
    { until: T.loss.lunge, line: "There's too many— I can't—", sfx: "virus" },
    { until: 5.1, line: "Thrusters are gone. I'm not flying anymore, I'm falling." },
    { until: 8, caption: "SYSTEM LOST", line: "...tell them I filed the paperwork..." },
    { until: T.loss.end, line: "Eh. I'll reboot. I always do. Go again?" },
  ],
};

function loadImg(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

/**
 * A beat nobody taps through eventually moves on by itself. This is not
 * pacing — it is the abandoned-kiosk safety net, set far longer than anyone
 * reading a single line would ever take, so the booth can never be left
 * stuck on a half-finished scene for the next student who walks up.
 */
const IDLE_ADVANCE_SEC = 45;

/**
 * Which sequences wait for the player and which play themselves.
 *
 * The intro is the one place someone is meeting the robot and the premise
 * for the first time, so it holds on every line and lets them read at their
 * own pace. Everything after that is a beat in a round already in progress —
 * a reward, or an ending — and stopping to ask for a tap there kills the
 * momentum. Those play straight through; a tap still skips ahead for anyone
 * who has seen them before.
 */
const HOLDS_FOR_TAP: Record<CinematicMode, boolean> = {
  intro: true,
  interlude: false,
  outroWin: false,
  outroLoss: false,
};

export class Cinematic {
  private images: Record<ImgKey, HTMLImageElement>;
  private mode: CinematicMode | null = null;
  /** Which line is on screen. Only a tap (or the idle net) moves this on. */
  private beatIndex = 0;
  private beatStartedAt = 0;
  private finished = false;

  /**
   * @param onBeat fires whenever a new line comes up, reporting whether the
   *   beat carries a caption and any one-shot sound it declares. It exists so
   *   audio can follow the script without this module having to know
   *   anything about sound.
   */
  constructor(private readonly onBeat?: (info: { hasCaption: boolean; sfx?: BeatSfx }) => void) {
    this.images = Object.fromEntries(Object.entries(SRC).map(([k, v]) => [k, loadImg(v)])) as Record<
      ImgKey,
      HTMLImageElement
    >;
  }

  start(mode: CinematicMode, now: number): void {
    this.mode = mode;
    this.beatIndex = 0;
    this.beatStartedAt = now;
    this.finished = false;
    // Announce the opening line too, so every beat is reported the same way
    // and the first one is not a silent special case.
    this.emitBeat(SCRIPT[mode][0]);
  }

  private beats(): Beat[] {
    return this.mode ? SCRIPT[this.mode] : [];
  }

  /** Seconds the current line has been on screen. Never stops climbing. */
  private beatAge(now: number): number {
    return (now - this.beatStartedAt) / 1000;
  }

  /** Where the current beat begins on the sequence timeline, in seconds. */
  private beatStart(): number {
    return this.beatIndex === 0 ? 0 : this.beats()[this.beatIndex - 1].until;
  }

  /** Player tapped: move to the next line, or end the sequence if that was
   * the last one. */
  advance(now: number): void {
    if (!this.mode || this.finished) return;
    this.beatIndex += 1;
    this.beatStartedAt = now;
    if (this.beatIndex >= this.beats().length) {
      this.finished = true;
      return;
    }
    this.emitBeat(this.beats()[this.beatIndex]);
  }

  private emitBeat(beat: Beat): void {
    this.onBeat?.({ hasCaption: beat.caption !== undefined, sfx: beat.sfx });
  }

  update(now: number): void {
    if (!this.mode || this.finished) return;
    const age = this.beatAge(now);
    if (HOLDS_FOR_TAP[this.mode]) {
      // Waits for a tap; the timeout is only the abandoned-kiosk net.
      if (age >= IDLE_ADVANCE_SEC) this.advance(now);
      return;
    }
    // Plays itself: each beat runs for its own slice of the timeline.
    const beats = this.beats();
    if (age >= beats[this.beatIndex].until - this.beatStart()) this.advance(now);
  }

  isDone(): boolean {
    return !this.mode || this.finished;
  }

  private draw(ctx: CanvasRenderingContext2D, key: ImgKey, cx: number, cy: number, height: number, alpha = 1): void {
    const img = this.images[key];
    if (!img.complete || img.naturalWidth === 0) return;
    const w = height * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, cx - w / 2, cy - height / 2, w, height);
    ctx.restore();
  }

  /**
   * Two clocks drive every scene, and the difference between them is what
   * makes a held shot look alive instead of frozen:
   *
   *  - `staged` walks through this beat's slice of the timeline and then
   *    STOPS at the end of it. Shot changes, camera moves and entrances all
   *    read from this, so the picture waits for the player exactly like the
   *    line does.
   *  - `anim` never stops. Idle motion — the star field, the robot's hover
   *    bob, celebration hops — reads from this, so a scene that is waiting
   *    on a tap still breathes.
   */
  render(ctx: CanvasRenderingContext2D, now: number, width: number, height: number, mascot: Mascot): void {
    if (!this.mode || this.finished) return;
    const beat = this.beats()[this.beatIndex];
    const age = this.beatAge(now);
    const anim = this.beatStart() + age;
    // Held just SHORT of the mark, not on it. A beat owns the half-open
    // interval [start, until), so landing exactly on `until` would tip the
    // scene into the next beat's shot while its own line is still up.
    const staged = Math.min(anim, beat.until - 1e-3);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#03060c");
    bg.addColorStop(1, "#080f1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    this.drawStars(ctx, width, height, anim);

    if (this.mode === "intro") this.renderIntro(ctx, staged, anim, width, height, mascot);
    else if (this.mode === "interlude") this.renderInterlude(ctx, staged, anim, width, height, mascot);
    else if (this.mode === "outroWin") this.renderWin(ctx, staged, anim, width, height, mascot);
    else this.renderLoss(ctx, staged, anim, width, height, mascot);

    this.drawScript(ctx, beat, age, width, height);
    if (age > 0.35) this.drawPrompt(ctx, width, height, age, HOLDS_FOR_TAP[this.mode]);
  }

  private drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, clock: number): void {
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const x = ((i * 9301 + 49297) % 233280) / 233280;
      const y = ((i * 4523 + 12345) % 199999) / 199999;
      const tw = 0.5 + 0.5 * Math.sin(clock * 2 + i);
      ctx.globalAlpha = 0.22 + tw * 0.5;
      ctx.fillStyle = i % 7 === 0 ? "#7dffb3" : "#cfe6ff";
      ctx.fillRect(x * width, y * height, 2, 2);
    }
    ctx.restore();
  }

  /**
   * Intro: wide establishing shot of the moon relay, a close-up on the robot
   * as it commits, then the burn toward the moon as the viruses erupt.
   */
  private renderIntro(
    ctx: CanvasRenderingContext2D,
    clock: number,
    anim: number,
    width: number,
    height: number,
    mascot: Mascot,
  ): void {
    const closeUp = clock >= T.intro.closeUpIn && clock < T.intro.closeUpOut;

    if (closeUp) {
      // CLOSE-UP: robot fills the frame, moon a soft shape far behind
      this.draw(ctx, "moon", width * 0.78, height * 0.3, height * 0.5, 0.35);
      const bob = Math.sin(anim * 2.2) * 8;
      mascot.drawPose(ctx, "idle", width * 0.42, height * 0.86 + bob, height * 0.72, 0, "#2effc7");
      return;
    }

    // WIDE: moon + server, robot burning toward it
    const approach = clamp01((clock - T.intro.closeUpOut) / (T.intro.end - T.intro.closeUpOut));
    const moonH = lerp(height * 0.4, height * 0.66, Math.max(0, approach));
    const moonX = width * 0.74;
    const moonY = height * 0.44;
    this.draw(ctx, "moon", moonX, moonY, moonH);
    this.draw(ctx, "server", moonX, moonY - moonH * 0.42, moonH * 0.36);

    // viruses erupt from behind the moon in the last beats
    const emerge = clamp01((clock - T.intro.viruses) / 1.8);
    if (emerge > 0) {
      const spots: Array<[number, number, ImgKey]> = [
        [-0.46, -0.08, "virusGreen"],
        [0.48, 0.1, "virusRedOpen"],
        [-0.32, 0.36, "virusRed"],
        [0.3, -0.34, "virusGreenOpen"],
      ];
      spots.forEach(([dx, dy, key], i) => {
        const t = clamp01(emerge - i * 0.12);
        if (t <= 0) return;
        const bob = Math.sin(anim * 3 + i) * 8;
        const x = moonX + moonH * dx * lerp(0.5, 1.15, t);
        const y = moonY + moonH * dy * lerp(0.5, 1.1, t) + bob;
        this.draw(ctx, key, x, y, height * 0.15 * lerp(0.6, 1, t), t);
      });
    }

    const flight = easeInOut(clamp01(clock / T.intro.end));
    const rx = lerp(-width * 0.1, width * 0.42, flight);
    const ry = lerp(height * 0.9, height * 0.6, flight);
    const robotH = lerp(height * 0.2, height * 0.3, clamp01(clock / T.intro.end));
    mascot.drawThruster(ctx, rx, ry, Math.atan2(-0.3, 0.9), 0.9);
    mascot.drawPose(ctx, "reach", rx, ry, robotH, 0.12);
  }

  /** Mid-round: a firewall layer falls, the sticker is banked, the swarm stirs. */
  private renderInterlude(
    ctx: CanvasRenderingContext2D,
    clock: number,
    anim: number,
    width: number,
    height: number,
    mascot: Mascot,
  ): void {
    const cx = width * 0.5;

    // the breached firewall: a bright ring collapsing outward
    const ringT = clamp01(clock / T.interlude.ring);
    ctx.save();
    ctx.globalAlpha = (1 - ringT) * 0.85;
    ctx.strokeStyle = "#2effc7";
    ctx.lineWidth = 8 * (1 - ringT) + 2;
    ctx.shadowColor = "#2effc7";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(cx, height * 0.5, lerp(60, Math.max(width, height) * 0.7, ringT), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // viruses closing in from the edges as the scene ends
    const swarm = clamp01((clock - T.interlude.swarm) / (T.interlude.end - T.interlude.swarm));
    if (swarm > 0) {
      const spots: Array<[number, number, ImgKey]> = [
        [0.1, 0.2, "virusRed"],
        [0.9, 0.28, "virusGreen"],
        [0.18, 0.8, "virusGreenOpen"],
        [0.84, 0.78, "virusRedOpen"],
      ];
      spots.forEach(([fx, fy, key], i) => {
        const t = clamp01(swarm - i * 0.1);
        if (t <= 0) return;
        const x = lerp(fx < 0.5 ? -100 : width + 100, width * fx, easeInOut(t));
        const y = height * fy + Math.sin(anim * 3 + i) * 10;
        this.draw(ctx, key, x, y, height * 0.17, 0.9);
      });
    }

    const hop = Math.abs(Math.sin(anim * 4.5)) * 22;
    const pose: SpriteKey = Math.floor(anim * 7) % 2 === 0 ? "celebrateA" : "celebrateB";
    mascot.drawPose(ctx, pose, cx, height * 0.78 - hop, height * 0.36, 0, "#ffd23f");
  }

  /** Win: the robot cracks the server open and the 10 BD comes out. */
  private renderWin(
    ctx: CanvasRenderingContext2D,
    clock: number,
    anim: number,
    width: number,
    height: number,
    mascot: Mascot,
  ): void {
    const moonH = height * 0.5;
    this.draw(ctx, "moon", width * 0.5, height * 0.92, moonH);

    const sx = width * 0.5;
    const sy = height * 0.42;
    const sh = height * 0.46;

    if (clock < T.win.blast) {
      this.draw(ctx, "server", sx, sy, sh);
    } else if (clock < T.win.ashes) {
      const shake = (1 - (clock - T.win.blast)) * 16;
      ctx.save();
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      this.draw(ctx, "serverBlast", sx, sy, sh * 1.08);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - (clock - T.win.blast) / 0.5) * 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (clock < T.win.money) {
      this.draw(ctx, "serverAshes", sx, sy, sh);
    } else {
      this.draw(ctx, "serverMoney", sx, sy, sh);
      const t = clamp01((clock - T.win.money) / 2.4);
      const r = lerp(50, 220, t);
      const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, r);
      g.addColorStop(0, `rgba(255, 214, 110, ${0.55 * (1 - t * 0.35)})`);
      g.addColorStop(1, "rgba(255, 214, 110, 0)");
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const approach = clamp01(clock / T.win.blast);
    const rx = lerp(-width * 0.1, width * 0.24, easeInOut(approach));
    const ry = lerp(height * 0.88, height * 0.66, easeInOut(approach));
    const robotH = height * 0.28;
    if (clock < T.win.blast) {
      mascot.drawThruster(ctx, rx, ry, Math.atan2(-0.25, 0.9), 0.95);
      mascot.drawPose(ctx, "reach", rx, ry, robotH, 0.14);
    } else {
      const hop = Math.abs(Math.sin(anim * 5)) * 18;
      const pose: SpriteKey = Math.floor(anim * 8) % 2 === 0 ? "celebrateA" : "celebrateB";
      mascot.drawPose(ctx, pose, rx, ry - hop, robotH, 0, "#ffd23f");
    }
  }

  /** Loss: a virus overwhelms the robot and it tumbles into the void. */
  private renderLoss(
    ctx: CanvasRenderingContext2D,
    clock: number,
    anim: number,
    width: number,
    height: number,
    mascot: Mascot,
  ): void {
    const cx = width * 0.5;
    const lunge = clamp01(clock / T.loss.lunge);

    let rx = cx;
    let ry = height * 0.5;
    let rot = 0;
    let alpha = 1;
    if (clock >= T.loss.fall) {
      const fall = clamp01((clock - T.loss.fall) / (T.loss.end - T.loss.fall));
      ry = lerp(height * 0.5, height * 1.3, fall * fall);
      rx = cx + Math.sin(fall * 7) * 46;
      rot = fall * 3.4;
      alpha = 1 - clamp01((fall - 0.6) / 0.4);
    }

    const vx = lerp(width * 1.2, cx + width * 0.12, easeInOut(lunge));
    const vy = lerp(-height * 0.25, height * 0.34, easeInOut(lunge));
    this.draw(ctx, lunge > 0.5 ? "virusRedOpen" : "virusRed", vx, vy + Math.sin(anim * 4) * 6, height * 0.32);

    mascot.drawPose(ctx, "panic", rx, ry, height * 0.28, rot, "#ff4d4d", alpha);

    const dark = clamp01((clock - T.loss.lunge) / 5);
    const vig = ctx.createRadialGradient(cx, height * 0.5, height * (0.6 - dark * 0.5), cx, height * 0.5, height);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${0.5 + dark * 0.5})`);
    ctx.save();
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** Renders the caption + robot dialogue for the beat currently held.
   * Fades in only — a line stays at full opacity until the player taps it
   * away, so nothing dims out from under a slow reader. */
  private drawScript(ctx: CanvasRenderingContext2D, beat: Beat, age: number, width: number, height: number): void {
    const fade = clamp01(age / 0.25);

    if (beat.caption) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.font = `800 ${Math.round(Math.min(32, width * 0.034))}px ${CANVAS_FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#eafff5";
      ctx.shadowColor = "rgba(46, 255, 199, 0.85)";
      ctx.shadowBlur = 18;
      ctx.fillText(beat.caption, width / 2, height * 0.11);
      ctx.restore();
    }

    if (beat.line) {
      const fontPx = Math.round(Math.min(22, width * 0.023));
      const boxW = Math.min(width * 0.86, 900);
      const padX = 20;
      const nameH = Math.round(fontPx * 1.5);

      // Wrap first, then size the box to the wrapped result — a long line on
      // a narrow window must never spill outside the panel.
      ctx.save();
      ctx.font = `700 ${fontPx}px ${CANVAS_FONT_STACK}`;
      const lines = wrapText(ctx, beat.line, boxW - padX * 2);
      const lineH = Math.round(fontPx * 1.35);
      const boxH = nameH + lines.length * lineH + fontPx * 0.7;
      const boxX = (width - boxW) / 2;
      const boxY = height - boxH - Math.max(28, height * 0.06);

      ctx.globalAlpha = fade;
      ctx.fillStyle = "rgba(6, 14, 22, 0.9)";
      ctx.strokeStyle = "rgba(46, 255, 199, 0.5)";
      ctx.lineWidth = 2;
      roundRect(ctx, boxX, boxY, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${Math.round(fontPx * 0.72)}px ${CANVAS_FONT_STACK}`;
      ctx.fillStyle = "#7dffb3";
      ctx.fillText("UNIT-01", boxX + padX, boxY + nameH * 0.62);

      ctx.font = `700 ${fontPx}px ${CANVAS_FONT_STACK}`;
      ctx.fillStyle = "#ffffff";
      lines.forEach((ln, i) => {
        ctx.fillText(ln, boxX + padX, boxY + nameH + lineH * (i + 0.5));
      });
      ctx.restore();
    }
  }

  /**
   * A held scene gets a pulsing "tap to continue" by the subtitle, because a
   * static frame with no prompt reads as a stuck game. A self-playing scene
   * gets a quiet "tap to skip" tucked in the corner instead — it is an
   * escape hatch for a repeat player, not an instruction.
   */
  private drawPrompt(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    age: number,
    holds: boolean,
  ): void {
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    if (holds) {
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(age * 3.4);
      ctx.font = `700 13px ${CANVAS_FONT_STACK}`;
      ctx.fillStyle = "#7dffb3";
      ctx.fillText("TAP TO CONTINUE  ▸", width - 26, height - 22);
    } else {
      ctx.globalAlpha = 0.32;
      ctx.font = `700 12px ${CANVAS_FONT_STACK}`;
      ctx.fillStyle = "#cfe6ff";
      ctx.fillText("TAP TO SKIP", width - 22, 26);
    }
    ctx.restore();
  }
}

/** Greedy word wrap against the current ctx.font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
