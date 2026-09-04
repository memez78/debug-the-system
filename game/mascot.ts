import { CONFIG } from "./config";
import type { MascotAnim } from "./types";
import { clamp, clamp01, lerp } from "./utils";

/**
 * Reactive mascot built from real character art (Kenney "Toon Characters —
 * Robot" pose set, CC0 — https://kenney.nl/assets/toon-characters-1, no
 * attribution required). It flies freely around the field, chasing the
 * player's pointer/last-touch point with a rocket-thruster flame trailing
 * behind it — so it visually feels player-driven without actually being a
 * control the round depends on. On top of that flight it still reacts to
 * taps/score/timer (idle, reach-and-zap, celebrate, panic, flinch) by
 * swapping poses and applying code-driven squash/stretch and bounce tweens.
 */

const SPRITE_ASPECT = 192 / 256;
const DISPLAY_HEIGHT = 170;

export type SpriteKey = "idle" | "reach" | "celebrateA" | "celebrateB" | "panic" | "flinch";

function loadSprite(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export class Mascot {
  private sprites: Record<SpriteKey, HTMLImageElement>;

  anim: MascotAnim = "idle";
  /** 0-1 thruster output, refreshed every update(). Drives both the drawn
   * flame and the thruster audio, so the two can never disagree. */
  flameIntensity = 0;
  animAge = 0;
  animDuration = 0;
  reachTargetX = 0;
  reachTargetY = 0;
  idleClock = 0;
  panicking = false;

  /** Current flying position (feet anchor — same convention the sprite is drawn against). */
  x = 0;
  y = 0;
  /** Point it's currently chasing — the pointer/last touch, or a station default. */
  private targetX = 0;
  private targetY = 0;
  private hasPointerTarget = false;
  /** Velocity this frame, px/s — drives bank tilt and the thruster flame. */
  private vx = 0;
  private vy = 0;

  constructor() {
    this.sprites = {
      idle: loadSprite("/mascot/robot_idle.png"),
      reach: loadSprite("/mascot/robot_interact.png"),
      celebrateA: loadSprite("/mascot/robot_cheer0.png"),
      celebrateB: loadSprite("/mascot/robot_cheer1.png"),
      panic: loadSprite("/mascot/robot_hurt.png"),
      flinch: loadSprite("/mascot/robot_hit.png"),
    };
  }

  /** Default position before any pointer input has happened yet (also
   * re-anchors on resize, but only until the player actually touches/moves). */
  setStation(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    if (!this.hasPointerTarget) {
      this.x = x;
      this.y = y;
    }
  }

  /** Called on every pointer move/down — the mascot chases this point. */
  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.hasPointerTarget = true;
  }

  trigger(anim: MascotAnim, durationSec: number, targetX?: number, targetY?: number): void {
    this.anim = anim;
    this.animAge = 0;
    this.animDuration = durationSec;
    if (targetX !== undefined && targetY !== undefined) {
      this.reachTargetX = targetX;
      this.reachTargetY = targetY;
    }
  }

  setPanicking(panicking: boolean): void {
    this.panicking = panicking;
  }

  update(dtSec: number): void {
    this.idleClock += dtSec;

    // Exponential-lag chase toward the target — stable at any dt (never
    // overshoots or oscillates), but still reads as smooth flight with
    // inertia rather than snapping.
    this.vx = (this.targetX - this.x) * CONFIG.MASCOT_FOLLOW_RATE;
    this.vy = (this.targetY - this.y) * CONFIG.MASCOT_FOLLOW_RATE;
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    // Kept here rather than recomputed in draw() so audio can follow the
    // flame without depending on a render pass having happened.
    const flySpeed = Math.hypot(this.vx, this.vy);
    this.flameIntensity = clamp01(
      (flySpeed - CONFIG.MASCOT_FLAME_MIN_SPEED) /
        (CONFIG.MASCOT_FLAME_MAX_SPEED - CONFIG.MASCOT_FLAME_MIN_SPEED),
    );

    if (this.anim !== "idle") {
      this.animAge += dtSec;
      if (this.animAge >= this.animDuration) {
        this.anim = "idle";
        this.animAge = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bob = Math.sin(this.idleClock * 2.4) * 4;
    let x = this.x;
    const y = this.y + bob;
    let scaleX = 1;
    let scaleY = 1;
    let lean = 0;
    let glowColor = "#2effc7";
    let sprite = this.sprites.idle;
    let shakeX = 0;

    const p = this.animDuration > 0 ? clamp01(this.animAge / this.animDuration) : 0;

    if (this.anim === "reach") {
      // quick anticipation squash, then a stretched lunge toward the target
      const lunge = Math.sin(p * Math.PI);
      scaleX = 1 - lunge * 0.12;
      scaleY = 1 + lunge * 0.14;
      lean = Math.sign(this.reachTargetX - this.x) * lunge * 0.12;
      glowColor = "#e6ffef";
      sprite = this.sprites.reach;
    } else if (this.anim === "celebrate") {
      const bounce = Math.abs(Math.sin(p * Math.PI * 3));
      scaleX = 1 - bounce * 0.08;
      scaleY = 1 + bounce * 0.16;
      glowColor = "#ffd23f";
      sprite = Math.floor(this.animAge * 6) % 2 === 0 ? this.sprites.celebrateA : this.sprites.celebrateB;
    } else if (this.anim === "flinch") {
      shakeX = Math.sin(p * Math.PI * 6) * 7 * (1 - p);
      scaleX = 1 + 0.1 * (1 - p);
      scaleY = 1 - 0.08 * (1 - p);
      glowColor = "#ff5a5a";
      sprite = this.sprites.flinch;
    } else if (this.panicking) {
      shakeX = Math.sin(this.idleClock * 40) * 2.5;
      glowColor = "#ff4d4d";
      sprite = this.sprites.panic;
    }

    x += shakeX;

    // bank into the direction of flight, on top of any reach-lean above
    const flySpeed = Math.hypot(this.vx, this.vy);
    const tilt = clamp(
      (this.vx / CONFIG.MASCOT_TILT_SATURATION_SPEED) * CONFIG.MASCOT_TILT_MAX_RAD,
      -CONFIG.MASCOT_TILT_MAX_RAD,
      CONFIG.MASCOT_TILT_MAX_RAD,
    );
    const totalRotation = lean + tilt;

    const displayHeight = DISPLAY_HEIGHT;
    const displayWidth = displayHeight * SPRITE_ASPECT;

    // rocket thruster flame — drawn in world space, unaffected by the
    // body's own squash/stretch/rotation below, so it always trails
    // cleanly opposite the direction of travel.
    if (flySpeed >= CONFIG.MASCOT_FLAME_MIN_SPEED) {
      const intensity =
        (flySpeed - CONFIG.MASCOT_FLAME_MIN_SPEED) /
        (CONFIG.MASCOT_FLAME_MAX_SPEED - CONFIG.MASCOT_FLAME_MIN_SPEED);
      this.drawThruster(ctx, x, y, Math.atan2(this.vy, this.vx), intensity);
    }

    ctx.save();
    ctx.translate(x, y);

    // ambient glow
    const glow = ctx.createRadialGradient(0, -displayHeight * 0.55, 6, 0, -displayHeight * 0.55, displayHeight * 0.9);
    glow.addColorStop(0, hexA(glowColor, 0.32));
    glow.addColorStop(1, hexA(glowColor, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -displayHeight * 0.55, displayHeight * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(totalRotation);
    ctx.scale(scaleX, scaleY);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;

    if (sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -displayWidth / 2, -displayHeight, displayWidth, displayHeight);
    }

    ctx.restore();
  }

  /**
   * A big, looping happy-jump celebration for the results screen — drawn at
   * an explicit position (not the flight position), large, with alternating
   * cheer poses, a bounce, squash-on-land, and a bright gold glow. Used to
   * pose the mascot peeking up behind the top edge of the results card.
   *
   * @param centerX horizontal center of the sprite
   * @param feetY   resting y of the sprite's feet (jump lifts it above this)
   * @param displayHeight sprite height at rest, px
   */
  drawCelebration(ctx: CanvasRenderingContext2D, centerX: number, feetY: number, displayHeight: number): void {
    const displayWidth = displayHeight * SPRITE_ASPECT;
    // one hop every ~0.7s: rises fast, hangs, lands with a squash
    const cycle = (this.idleClock % 0.75) / 0.75;
    const hop = Math.sin(cycle * Math.PI); // 0→1→0
    const lift = hop * displayHeight * 0.22;
    const landing = cycle > 0.9 ? (cycle - 0.9) / 0.1 : 0; // squash right at touchdown
    const scaleX = 1 + landing * 0.12 + hop * 0.04;
    const scaleY = 1 - landing * 0.12 + hop * 0.08;
    // alternate the two cheer poses a few times per second for a lively wave
    const sprite = Math.floor(this.idleClock * 8) % 2 === 0 ? this.sprites.celebrateA : this.sprites.celebrateB;
    const sway = Math.sin(this.idleClock * 3) * 0.06;

    ctx.save();
    ctx.translate(centerX, feetY - lift);

    // big celebratory glow
    const glow = ctx.createRadialGradient(0, -displayHeight * 0.5, 8, 0, -displayHeight * 0.5, displayHeight * 1.05);
    glow.addColorStop(0, "rgba(255, 210, 63, 0.42)");
    glow.addColorStop(0.5, "rgba(255, 210, 63, 0.18)");
    glow.addColorStop(1, "rgba(255, 210, 63, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -displayHeight * 0.5, displayHeight * 1.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(sway);
    ctx.scale(scaleX, scaleY);
    ctx.shadowColor = "#ffd23f";
    ctx.shadowBlur = 26;
    if (sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -displayWidth / 2, -displayHeight, displayWidth, displayHeight);
    }
    ctx.restore();
  }

  /**
   * Draws a specific pose at an explicit position — used by the intro/outro
   * cinematics to choreograph the same robot art outside of normal flight.
   */
  drawPose(
    ctx: CanvasRenderingContext2D,
    key: SpriteKey,
    x: number,
    y: number,
    displayHeight: number,
    rotation = 0,
    glowColor = "#2effc7",
    alpha = 1,
  ): void {
    const sprite = this.sprites[key];
    if (!sprite.complete || sprite.naturalWidth === 0) return;
    const displayWidth = displayHeight * SPRITE_ASPECT;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    const glow = ctx.createRadialGradient(0, -displayHeight * 0.5, 6, 0, -displayHeight * 0.5, displayHeight * 0.9);
    glow.addColorStop(0, hexA(glowColor, 0.3));
    glow.addColorStop(1, hexA(glowColor, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -displayHeight * 0.5, displayHeight * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(rotation);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.drawImage(sprite, -displayWidth / 2, -displayHeight, displayWidth, displayHeight);
    ctx.restore();
  }

  /** Thruster flame pointing opposite `angle` (the direction of travel).
   * `intensity` 0-1 scales length/width. Shared by normal flight and the
   * cinematics so the rocket reads identically in both. */
  drawThruster(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, intensity: number): void {
    const t = clamp01(intensity);
    const len = lerp(16, CONFIG.MASCOT_FLAME_MAX_LENGTH, t);
    const width = lerp(5, 13, t);
    const flicker = 1 + Math.sin(this.idleClock * 26) * 0.16;

    ctx.save();
    ctx.translate(x, y - 4);
    ctx.rotate(angle + Math.PI);

    const grad = ctx.createLinearGradient(0, 0, len * flicker, 0);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.25, "rgba(255, 214, 110, 0.9)");
    grad.addColorStop(0.6, "rgba(255, 140, 60, 0.55)");
    grad.addColorStop(1, "rgba(255, 90, 60, 0)");
    ctx.fillStyle = grad;
    ctx.shadowColor = "#ff9d4d";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, -width / 2);
    ctx.quadraticCurveTo(len * 0.5 * flicker, 0, len * flicker, 0);
    ctx.quadraticCurveTo(len * 0.5 * flicker, 0, 0, width / 2);
    ctx.closePath();
    ctx.fill();

    // trailing embers
    ctx.shadowBlur = 0;
    for (let i = 0; i < 2; i++) {
      const emberT = (this.idleClock * 3 + i * 0.5) % 1;
      const ex = len * flicker * emberT;
      const ey = Math.sin(this.idleClock * 9 + i * 4) * width * 0.4 * (1 - emberT);
      ctx.globalAlpha = (1 - emberT) * 0.8;
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}

function hexA(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
