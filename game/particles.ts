import { CANVAS_FONT_STACK } from "./canvasFont";
import { shadowBlurPx } from "./quality";
import type { FloatingText, Particle } from "./types";
import { randRange } from "./utils";

export function spawnBurst(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = randRange(0, Math.PI * 2);
    const speed = randRange(60, 260);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: randRange(0.35, 0.75),
      size: randRange(2, 5),
      color,
    });
  }
}

export function updateParticles(particles: Particle[], dtSec: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dtSec;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.94;
    p.vy = p.vy * 0.94 + 40 * dtSec;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  if (particles.length === 0) return;
  for (const p of particles) {
    const t = p.age / p.life;
    const alpha = 1 - t;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - t * 0.5)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function spawnFloatingText(
  texts: FloatingText[],
  x: number,
  y: number,
  text: string,
  color: string,
  size = 22,
): void {
  texts.push({ x, y, vy: -46, age: 0, life: 1.1, text, color, size });
}

export function updateFloatingTexts(texts: FloatingText[], dtSec: number): void {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.age += dtSec;
    if (t.age >= t.life) {
      texts.splice(i, 1);
      continue;
    }
    t.y += t.vy * dtSec;
    t.vy *= 0.96;
  }
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  if (texts.length === 0) return;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const shadow = shadowBlurPx(12);
  for (const t of texts) {
    const p = t.age / t.life;
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.font = `700 ${t.size}px ${CANVAS_FONT_STACK}`;
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = shadow;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
