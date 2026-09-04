const RAIN_CHARS = "01{}<>/;=+-#$%&010101";

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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const colWidth = 22;
    const count = Math.ceil(width / colWidth);
    this.columns = Array.from({ length: count }, (_, i) => ({
      x: i * colWidth + colWidth / 2,
      y: Math.random() * -height,
      speed: 18 + Math.random() * 26,
      chars: Array.from({ length: 10 }, () => randomRainChar()),
    }));
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
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, "#050a10");
    g.addColorStop(1, "#0a1420");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

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

    // digital rain, faint — reads as "code" from a distance without being legible/distracting
    ctx.font = `12px ${monoFont}`;
    ctx.textAlign = "center";
    for (const col of this.columns) {
      for (let i = 0; i < col.chars.length; i++) {
        const cy = col.y - i * 18;
        if (cy < -20 || cy > this.height + 20) continue;
        const alpha = 0.16 * (1 - i / col.chars.length);
        ctx.fillStyle = i === 0 ? "rgba(125, 255, 179, 0.28)" : `rgba(57, 214, 255, ${alpha})`;
        ctx.fillText(col.chars[i], col.x, cy);
      }
    }
  }
}

function randomRainChar(): string {
  return RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
}
