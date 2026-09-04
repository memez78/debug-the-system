import { RENDER_QUALITY } from "./quality";

const RAIN_CHARS = "01{}<>/;=+-#$%&010101";

/** Column spacing and trail length at full density. Both are scaled by the
 * render tier's `rainScale`, because the rain is the biggest source of draw
 * calls in an otherwise idle frame. */
const COLUMN_SPACING_PX = 22;
const TRAIL_LENGTH = 10;
const CHAR_SPACING_PX = 18;
/** The screen shake in GameEngine.render translates the whole scene by a
 * few px, which would otherwise expose an unpainted edge. The base fill is
 * overdrawn by this much so there is nothing to expose. */
const BLEED_PX = 16;

interface RainColumn {
  x: number;
  y: number;
  speed: number;
  chars: string[];
}

export class ParallaxBackground {
  private columns: RainColumn[] = [];
  private gridOffset = 0;
  private width = 0;
  private height = 0;
  /** Rebuilt on resize only. Building a gradient is an allocation plus a
   * ramp evaluation; there is no reason to pay it 60 times a second for a
   * gradient whose stops and geometry never change. */
  private baseGradient: CanvasGradient | null = null;
  /** One rgba string per trail position, built once. The old code assembled
   * a fresh colour string for every character of every column on every
   * frame — several hundred throwaway strings a frame, all of them one of
   * ten values. */
  private trailColors: string[] = [];

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.baseGradient = null;

    const scale = RENDER_QUALITY.rainScale;
    const colWidth = COLUMN_SPACING_PX / scale;
    const trail = Math.max(2, Math.round(TRAIL_LENGTH * scale));
    const count = Math.ceil(width / colWidth);
    this.columns = Array.from({ length: count }, (_, i) => ({
      x: i * colWidth + colWidth / 2,
      y: Math.random() * -height,
      speed: 18 + Math.random() * 26,
      chars: Array.from({ length: trail }, () => randomRainChar()),
    }));

    this.trailColors = Array.from({ length: trail }, (_, i) =>
      i === 0 ? "rgba(125, 255, 179, 0.28)" : `rgba(57, 214, 255, ${0.16 * (1 - i / trail)})`,
    );
  }

  update(dtSec: number): void {
    this.gridOffset = (this.gridOffset + dtSec * 14) % 48;
    for (const col of this.columns) {
      col.y += col.speed * dtSec;
      if (col.y > this.height + 200) {
        col.y = -Math.random() * 200;
        col.speed = 18 + Math.random() * 26;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, monoFont: string): void {
    // base
    if (!this.baseGradient) {
      const g = ctx.createLinearGradient(0, 0, 0, this.height);
      g.addColorStop(0, "#050a10");
      g.addColorStop(1, "#0a1420");
      this.baseGradient = g;
    }
    ctx.fillStyle = this.baseGradient;
    ctx.fillRect(-BLEED_PX, -BLEED_PX, this.width + BLEED_PX * 2, this.height + BLEED_PX * 2);

    // scrolling grid, faint
    ctx.strokeStyle = "rgba(46, 255, 199, 0.06)";
    ctx.lineWidth = 1;
    const size = 48;
    ctx.beginPath();
    for (let x = -size + this.gridOffset; x < this.width + size; x += size) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = -size + this.gridOffset; y < this.height + size; y += size) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    // Digital rain, faint — reads as "code" from a distance without being
    // legible or distracting.
    //
    // Trail position is the OUTER loop and the column the inner one, which
    // looks backwards and is the whole point: every character at a given
    // trail position shares one colour, so this sets fillStyle once per
    // position (ten times a frame) instead of once per character (several
    // hundred). Each change of fillStyle is a state flush in the 2D context,
    // and on a phone that dominated the cost of the whole background.
    ctx.font = `12px ${monoFont}`;
    ctx.textAlign = "center";
    const trail = this.trailColors.length;
    for (let i = 0; i < trail; i++) {
      ctx.fillStyle = this.trailColors[i];
      const offset = i * CHAR_SPACING_PX;
      for (const col of this.columns) {
        const cy = col.y - offset;
        if (cy < -20 || cy > this.height + 20) continue;
        ctx.fillText(col.chars[i], col.x, cy);
      }
    }
  }
}

function randomRainChar(): string {
  return RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
}
