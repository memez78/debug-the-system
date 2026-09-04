import { ANSWER_BLOCK_HEIGHT, ANSWER_BLOCK_MAX_WIDTH, ANSWER_BLOCK_MIN_WIDTH, ANSWER_BLOCK_PADDING_X, CONFIG } from "./config";
import type { AnswerBlock, Question } from "./types";
import { clamp, clamp01, nextId, pick, randRange, shuffle } from "./utils";

/**
 * Every answer block is drawn in this one colour.
 *
 * There is deliberately no "correct" colour and no "wrong" colour. An
 * earlier version tinted the right answer differently and then tried to
 * disguise it as the streak grew, which had it exactly backwards: at a low
 * streak the odd-coloured block simply *was* the answer, readable across the
 * room without reading a word of the question. Nothing about how a block is
 * drawn may depend on whether it is correct.
 */
export const BLOCK_COLOR = "#39d6ff";

const CORRECT_FLASH_FACTS = ["CORRECT!", "NAILED IT", "SYSTEM PATCHED", "NICE CATCH", "DEBUGGED"];
const WRONG_FLASH_FACTS = ["NOT QUITE", "WRONG BRANCH", "TRY AGAIN", "MISFIRE"];

export function randomCorrectFlashFact(): string {
  return pick(CORRECT_FLASH_FACTS);
}

export function randomWrongFlashFact(): string {
  return pick(WRONG_FLASH_FACTS);
}

/** Picks `count` options from a question (always including the correct
 * one), in randomized on-screen order. */
export function selectOptions(q: Question, count: number): { texts: string[]; correctIdx: number } {
  const wrongIndices = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex);
  const chosenWrong = shuffle(wrongIndices).slice(0, Math.max(0, count - 1));
  const chosenIndices = shuffle([q.correctIndex, ...chosenWrong]);
  return {
    texts: chosenIndices.map((i) => q.options[i]),
    correctIdx: chosenIndices.indexOf(q.correctIndex),
  };
}

export function measureBlockWidth(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  ctx.font = font;
  const w = ctx.measureText(text).width + ANSWER_BLOCK_PADDING_X * 2;
  return clamp(w, ANSWER_BLOCK_MIN_WIDTH, ANSWER_BLOCK_MAX_WIDTH);
}

/** The band answer blocks are allowed to live in. The top margin has to
 * clear the whole HUD stack (question banner + score/timer row + progress
 * bar) or blocks end up drifting underneath the timer; the bottom margin
 * keeps them off the mascot and the CTA text. */
export interface FieldBounds {
  top: number;
  bottom: number;
}

/** Scatters `count` block positions across the play field, inside `bounds`. */
export function layoutPositions(
  count: number,
  width: number,
  height: number,
  bounds: FieldBounds,
): { x: number; y: number }[] {
  const topMargin = bounds.top;
  const bottomMargin = bounds.bottom;
  const usableHeight = Math.max(90, height - topMargin - bottomMargin);
  const colWidth = width / count;
  const positions = Array.from({ length: count }, (_, i) => ({
    x: colWidth * i + colWidth * randRange(0.22, 0.78),
    y: topMargin + usableHeight * randRange(0.1, 0.9),
  }));
  return shuffle(positions);
}

export function spawnAnswerBlocks(
  ctx: CanvasRenderingContext2D,
  question: Question,
  count: number,
  windowMs: number,
  driftSpeed: number,
  now: number,
  font: string,
  width: number,
  height: number,
  bounds: FieldBounds,
): AnswerBlock[] {
  const { texts, correctIdx } = selectOptions(question, count);
  const positions = layoutPositions(texts.length, width, height, bounds);
  return texts.map((text, i) => {
    const angle = randRange(0, Math.PI * 2);
    return {
      id: nextId(),
      text,
      isCorrect: i === correctIdx,
      x: positions[i].x,
      y: positions[i].y,
      vx: Math.cos(angle) * driftSpeed,
      vy: Math.sin(angle) * driftSpeed,
      width: measureBlockWidth(ctx, text, font),
      spawnedAt: now,
      expiresAt: now + windowMs,
      seed: Math.random() * 1000,
    };
  });
}

/** Drifts every block and bounces it off the play-field bounds (the same
 * top/bottom bands reserved at spawn time). */
export function updateAnswerBlocks(
  blocks: AnswerBlock[],
  dtSec: number,
  width: number,
  height: number,
  bounds: FieldBounds,
): void {
  const topMargin = bounds.top;
  const bottomMargin = bounds.bottom;
  for (const b of blocks) {
    b.x += b.vx * dtSec;
    b.y += b.vy * dtSec;
    const halfW = b.width / 2;
    const halfH = ANSWER_BLOCK_HEIGHT / 2;
    if (b.x - halfW < 8) {
      b.x = 8 + halfW;
      b.vx = Math.abs(b.vx);
    } else if (b.x + halfW > width - 8) {
      b.x = width - 8 - halfW;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - halfH < topMargin) {
      b.y = topMargin + halfH;
      b.vy = Math.abs(b.vy);
    } else if (b.y + halfH > height - bottomMargin) {
      b.y = height - bottomMargin - halfH;
      b.vy = -Math.abs(b.vy);
    }
  }
}

/**
 * Draws one answer block.
 *
 * This function never reads `b.isCorrect`, and it must stay that way. Every
 * effect below is either scene-wide or seeded from `b.seed`, which is
 * assigned at spawn without regard to which option is right — so the
 * instability escalates with the streak without ever pointing at the answer.
 */
export function drawAnswerBlock(
  ctx: CanvasRenderingContext2D,
  b: AnswerBlock,
  now: number,
  camoIntensity: number,
  font: string,
): void {
  const spawnT = clamp01((now - b.spawnedAt) / CONFIG.SPAWN_TWEEN_MS);
  const scale = spawnT < 1 ? easeOutBack(spawnT) : 1;

  // Scene-wide wobble, applied to every block once camouflage kicks in.
  const wobbleAmp = camoIntensity * CONFIG.ESCALATION_WOBBLE_MAX_PX;
  let drawX = b.x + Math.sin(now / 180 + b.seed) * wobbleAmp;
  let drawY = b.y + Math.cos(now / 150 + b.seed * 1.7) * wobbleAmp;

  const color = BLOCK_COLOR;
  let flickering = false;

  if (camoIntensity > 0) {
    // Each block flickers and jitters on its own seeded phase, so at a high
    // streak the whole field is unstable and no single block stands out.
    const flickerChance = camoIntensity * CONFIG.ESCALATION_CAMOUFLAGE_FLICKER_CHANCE;
    flickering = (Math.sin(now / 240 + b.seed) + 1) / 2 < flickerChance;
    const jitterAmp = camoIntensity * CONFIG.ESCALATION_CAMOUFLAGE_JITTER_PX;
    drawX += Math.sin(now / 55 + b.seed * 3) * jitterAmp;
    drawY += Math.cos(now / 47 + b.seed * 5) * jitterAmp;
  }

  const lifeT = clamp01((now - b.spawnedAt) / (b.expiresAt - b.spawnedAt));
  const remaining = 1 - lifeT;
  const halfW = b.width / 2;
  const halfH = ANSWER_BLOCK_HEIGHT / 2;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.scale(scale, scale);

  // Chromatic-aberration ghosting on every block, escalating with the streak.
  if (camoIntensity > 0) {
    const off = camoIntensity * CONFIG.ESCALATION_CHROMATIC_MAX_PX;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ff3b3b";
    roundRectPath(ctx, -halfW - off, -halfH, b.width, ANSWER_BLOCK_HEIGHT, 12);
    ctx.fill();
    ctx.fillStyle = "#39d6ff";
    roundRectPath(ctx, -halfW + off, -halfH, b.width, ANSWER_BLOCK_HEIGHT, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // glow
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, halfW * 1.5);
  glow.addColorStop(0, hexA(color, 0.35));
  glow.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, halfW * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = "rgba(10, 16, 22, 0.88)";
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = flickering ? 22 : 16;
  ctx.lineWidth = 3;
  roundRectPath(ctx, -halfW, -halfH, b.width, ANSWER_BLOCK_HEIGHT, 14);
  ctx.fill();
  ctx.stroke();

  // remaining-time bar
  ctx.shadowBlur = 0;
  ctx.fillStyle = hexA(color, 0.25);
  ctx.fillRect(-halfW, halfH + 7, b.width, 4);
  ctx.fillStyle = hexA(color, 0.95);
  ctx.fillRect(-halfW, halfH + 7, b.width * remaining, 4);

  // text — always a stable, readable color regardless of camouflage state
  ctx.shadowBlur = flickering ? 10 : 6;
  ctx.shadowColor = color;
  ctx.fillStyle = "#eafff5";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  // maxWidth guarantees a long option is condensed to fit rather than
  // spilling outside the block, since block width is clamped to
  // ANSWER_BLOCK_MAX_WIDTH no matter how long the text is.
  ctx.fillText(b.text, 0, 1, b.width - ANSWER_BLOCK_PADDING_X);

  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeOutBack(t: number): number {
  const c1 = 1.7;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function hexA(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

