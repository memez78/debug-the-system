import { clamp01, lerp, randRange } from "./utils";

/**
 * The "illusion" layer: once a player's score crosses the tech-kit
 * threshold the world starts turning against them — the colour drains to
 * red, the moon looms in from the top of the screen and viruses drift
 * across the field. It's pure atmosphere: nothing here is tappable and
 * nothing here touches scoring, so the game stays fair while *feeling*
 * like it's closing in. Everything scales smoothly from an intensity of
 * 0 (nothing) to 1 (full chaos) so it ramps in rather than snapping on.
 */

const VIRUS_SRC = ["/cinematic/virus_red.png", "/cinematic/virus_green.png", "/cinematic/virus_red._mouth_open.png"];
const MOON_SRC = "/cinematic/moon.png";

interface FieldVirus {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  img: number;
}

function load(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export class Illusion {
  private viruses: HTMLImageElement[] = VIRUS_SRC.map(load);
  private moon = load(MOON_SRC);
  private field: FieldVirus[] = [];
  private clock = 0;

  reset(): void {
    this.field = [];
    this.clock = 0;
  }

  /** @param intensity 0-1 — how far past the trigger score the player is. */
  update(dtSec: number, intensity: number, width: number, height: number): void {
    this.clock += dtSec;
    if (intensity <= 0) {
      if (this.field.length) this.field = [];
      return;
    }

    // more viruses on screen the deeper in they get
    const target = Math.round(lerp(1, 6, intensity));
    while (this.field.length < target) {
      const fromLeft = Math.random() < 0.5;
      this.field.push({
        // spawn already on-screen so the swarm lands the instant the
        // illusion triggers, rather than drifting in half a minute later
        x: randRange(width * 0.08, width * 0.92),
        y: randRange(height * 0.25, height * 0.85),
        vx: (fromLeft ? 1 : -1) * randRange(24, 70) * lerp(0.6, 1.6, intensity),
        vy: randRange(-18, 18),
        size: randRange(70, 130) * lerp(0.75, 1.15, intensity),
        spin: randRange(-0.5, 0.5),
        img: Math.floor(Math.random() * this.viruses.length),
      });
    }
    while (this.field.length > target) this.field.pop();

    for (const v of this.field) {
      v.x += v.vx * dtSec;
      v.y += v.vy * dtSec;
      // Bounce off the band edges. Clamping as well as flipping matters: a
      // resize can leave a virus outside the band, and a bare flip would
      // then invert vy every frame and vibrate it in place forever.
      const minY = height * 0.2;
      const maxY = height * 0.9;
      if (v.y < minY) {
        v.y = minY;
        v.vy = Math.abs(v.vy);
      } else if (v.y > maxY) {
        v.y = maxY;
        v.vy = -Math.abs(v.vy);
      }
      // wrap around so they keep streaming past
      if (v.vx > 0 && v.x > width + 160) v.x = -160;
      if (v.vx < 0 && v.x < -160) v.x = width + 160;
    }
  }

  /** Drawn *behind* the answer blocks so the questions stay readable. */
  drawBehind(ctx: CanvasRenderingContext2D, intensity: number, width: number, height: number): void {
    if (intensity <= 0) return;
    const t = clamp01(intensity);

    // creeping red wash + occasional white "static" flashes
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 2.4);
    ctx.save();
    ctx.fillStyle = `rgba(120, 10, 25, ${0.1 + 0.32 * t * (0.6 + 0.4 * pulse)})`;
    ctx.fillRect(0, 0, width, height);
    const flash = Math.max(0, Math.sin(this.clock * 1.7 + Math.sin(this.clock * 0.7) * 2) - 0.93) / 0.07;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.3 * t})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();

    // the moon looms in from the top, closer the deeper they get
    if (this.moon.complete && this.moon.naturalWidth > 0) {
      const moonSize = lerp(height * 0.7, height * 1.5, t);
      const cx = width * 0.5 + Math.sin(this.clock * 0.35) * width * 0.04;
      const cy = lerp(-moonSize * 0.85, -moonSize * 0.42, t) + Math.sin(this.clock * 0.6) * 10;
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.5 * t;
      ctx.drawImage(this.moon, cx - moonSize / 2, cy, moonSize, moonSize);
      ctx.restore();
    }

    // viruses drifting across the field
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.4 * t;
    for (const v of this.field) {
      const img = this.viruses[v.img];
      if (!img.complete || img.naturalWidth === 0) continue;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(Math.sin(this.clock * v.spin) * 0.25);
      ctx.drawImage(img, -v.size / 2, -v.size / 2, v.size, v.size);
      ctx.restore();
    }
    ctx.restore();
  }

  /** A thin vignette on top of everything — never covers the question text. */
  drawFront(ctx: CanvasRenderingContext2D, intensity: number, width: number, height: number): void {
    if (intensity <= 0) return;
    const t = clamp01(intensity);
    const vig = ctx.createRadialGradient(width / 2, height / 2, height * 0.42, width / 2, height / 2, height * 0.95);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(60, 0, 10, ${0.3 + 0.4 * t})`);
    ctx.save();
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
