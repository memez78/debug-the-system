import { cachedGradient } from "./gradients";
import { shadowBlurPx } from "./quality";
import { clamp01 } from "./utils";

/**
 * The attract-mode "10 BD" prize badge — a real photo of the Bahraini 10
 * Dinar note (front), not a UI card: nothing drawn behind it but a soft
 * glow, so it never reads as a floating rectangle/box. It drops in,
 * settles with a little bounce, lingers, and fades — purely decorative,
 * so the prize registers at a glance even to someone who never stops to
 * read the title text.
 *
 * Image: "Бахрейн 10.jpg" by ValeewIldar, Wikimedia Commons, CC BY-SA 4.0.
 * https://commons.wikimedia.org/wiki/File:%D0%91%D0%B0%D1%85%D1%80%D0%B5%D0%B9%D0%BD_10.jpg
 */

const NOTE_ASPECT = 600 / 281;
const DISPLAY_WIDTH = 320;
const DISPLAY_HEIGHT = DISPLAY_WIDTH / NOTE_ASPECT;

let noteImage: HTMLImageElement | null = null;

function getNoteImage(): HTMLImageElement {
  if (!noteImage) {
    noteImage = new Image();
    noteImage.src = "/prize/bd10_note.jpg";
  }
  return noteImage;
}

function easeOutBack(t: number): number {
  const c1 = 1.7;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** @param dropT 0-1 drop-and-settle progress (eased internally). */
export function drawPrizeNote(ctx: CanvasRenderingContext2D, x: number, y: number, dropT: number, alpha: number, idleClock: number): void {
  const img = getNoteImage();
  if (!img.complete || img.naturalWidth === 0) return;

  const settle = easeOutBack(clamp01(dropT));
  const scale = Math.min(1, settle);
  const bob = dropT >= 1 ? Math.sin(idleClock * 2.1) * 3 : 0;
  const tilt = dropT < 1 ? (1 - clamp01(dropT)) * 0.35 : Math.sin(idleClock * 1.3) * 0.035;
  const shimmer = 0.85 + Math.sin(idleClock * 2.6) * 0.15;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + bob);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  // Soft glow only — nothing else behind the note, so it never reads as a
  // card. The shimmer rides on globalAlpha rather than being baked into a
  // colour stop, which keeps the gradient itself constant and cacheable.
  const glowRadius = DISPLAY_WIDTH * 0.72;
  ctx.fillStyle = cachedGradient(ctx, "prizeNote", (c) => {
    const g = c.createRadialGradient(0, 0, 4, 0, 0, glowRadius);
    g.addColorStop(0, "rgba(255, 210, 63, 0.4)");
    g.addColorStop(1, "rgba(255, 210, 63, 0)");
    return g;
  });
  ctx.globalAlpha = alpha * shimmer;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = shadowBlurPx(16);
  ctx.shadowOffsetY = 4;
  ctx.drawImage(img, -DISPLAY_WIDTH / 2, -DISPLAY_HEIGHT / 2, DISPLAY_WIDTH, DISPLAY_HEIGHT);

  ctx.restore();
}
