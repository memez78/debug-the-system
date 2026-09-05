import { ANSWER_BLOCK_DESKTOP, ANSWER_BLOCK_PHONE, CONFIG, PHONE_MAX_WIDTH_PX } from "./config";
import { CANVAS_FONT_STACK } from "./canvasFont";
import type { AnswerBlock, Question } from "./types";
import { cachedGradient } from "./gradients";
import { shadowBlurPx } from "./quality";
import { clamp, clamp01, nextId, pick, randRange, shuffle } from "./utils";

export type BlockMetrics = typeof ANSWER_BLOCK_DESKTOP | typeof ANSWER_BLOCK_PHONE;

/** Minimum clear space between two stacked rows, px. */
const STACK_MIN_GAP = 10;

/**
 * Block sizing for a viewport width.
 *
 * On a phone the desktop numbers cannot work: a 380px block is wider than a
 * 375px screen, and `layoutPositions` gives each block only width/count of
 * room, so three of them overlap before anything has even moved. The phone
 * layout shrinks the blocks and stacks them one per row instead.
 */
export function blockMetrics(viewportWidth: number): BlockMetrics {
  return viewportWidth <= PHONE_MAX_WIDTH_PX ? ANSWER_BLOCK_PHONE : ANSWER_BLOCK_DESKTOP;
}

/** The canvas font for a given block text size. */
export function blockFont(fontPx: number): string {
  return `700 ${fontPx}px ${CANVAS_FONT_STACK}`;
}

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

/**
 * Every tint derived from BLOCK_COLOR, resolved once at module load.
 *
 * These were previously built by a `hexA()` helper called four or five
 * times per block per frame — parsing the same three hex pairs and
 * allocating the same handful of strings sixty times a second, for values
 * that cannot change because both the colour and the alphas are constants.
 */
/** Gap kept between a block and the left/right edge of the canvas, both
 * when its width is chosen and when it bounces. */
export const ANSWER_BLOCK_EDGE_MARGIN_PX = 8;

const GLOW_INNER = withAlpha(BLOCK_COLOR, 0.35);
const GLOW_OUTER = withAlpha(BLOCK_COLOR, 0);
const TIMER_BAR_TRACK = withAlpha(BLOCK_COLOR, 0.25);
const TIMER_BAR_FILL = withAlpha(BLOCK_COLOR, 0.95);
const BLOCK_BODY_FILL = "rgba(10, 16, 22, 0.88)";
const BLOCK_TEXT_FILL = "#eafff5";

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

/**
 * Width of the block that holds `text`, clamped so it always fits.
 *
 * The upper clamp is the smaller of the layout's own maximum and what the
 * canvas can actually hold: on a 375px phone a 380px block is wider than the
 * screen, and updateAnswerBlocks would then pin it against both edges at
 * once and fight itself.
 */
export function measureBlockWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  m: BlockMetrics,
  viewportWidth: number,
): number {
  ctx.font = blockFont(m.fontPx);
  const w = ctx.measureText(text).width + m.paddingX * 2;
  const fits = viewportWidth - ANSWER_BLOCK_EDGE_MARGIN_PX * 2;
  const maxWidth = Math.max(1, Math.min(m.maxWidth, fits));
  return clamp(w, Math.min(m.minWidth, maxWidth), maxWidth);
}

/** The band answer blocks are allowed to live in. The top margin has to
 * clear the whole HUD stack (question banner + score/timer row + progress
 * bar) or blocks end up drifting underneath the timer; the bottom margin
 * keeps them off the mascot and the CTA text. */
export interface FieldBounds {
  top: number;
  bottom: number;
}

/**
 * Places `count` blocks inside `bounds`.
 *
 * Wide screens scatter them into columns, which is what makes the field feel
 * alive. Narrow screens cannot: a column is only width/count across, far
 * narrower than a block, so scattering guarantees overlap. There they get one
 * row each instead — no horizontal competition, and rows that cannot cross.
 */
export function layoutPositions(
  count: number,
  width: number,
  height: number,
  bounds: FieldBounds,
  m: BlockMetrics,
): { x: number; y: number }[] {
  const usableHeight = Math.max(90, height - bounds.top - bounds.bottom);

  if (m.stacked) {
    const minRow = m.height + STACK_MIN_GAP;
    let rowHeight = usableHeight / count;
    let top = bounds.top;
    if (rowHeight < minRow) {
      // Not enough room for this many rows at a readable spacing. Space them
      // at the minimum anyway and pull the stack upward to fit: encroaching
      // on a margin is a lot better than two answers printed on top of each
      // other, which is unreadable rather than merely tight.
      rowHeight = minRow;
      top = Math.max(8, bounds.top - (count * minRow - usableHeight));
    }
    return Array.from({ length: count }, (_, i) => ({
      x: width / 2,
      y: top + rowHeight * (i + 0.5),
    }));
  }

  const colWidth = width / count;
  const positions = Array.from({ length: count }, (_, i) => ({
    x: colWidth * i + colWidth * randRange(0.22, 0.78),
    y: bounds.top + usableHeight * randRange(0.1, 0.9),
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
  width: number,
  height: number,
  bounds: FieldBounds,
): AnswerBlock[] {
  const { texts, correctIdx } = selectOptions(question, count);
  const m = blockMetrics(width);
  const positions = layoutPositions(texts.length, width, height, bounds, m);
  return texts.map((text, i) => {
    const blockWidth = measureBlockWidth(ctx, text, m, width);
    let vx: number;
    let vy: number;
    if (m.stacked) {
      // Rows drift sideways only, so no two blocks can ever meet. If a block
      // is nearly as wide as the screen there is nowhere to drift to, and
      // jittering against the walls looks broken — so it just sits still.
      const room = width - 16 - blockWidth;
      vx = room < 40 ? 0 : (Math.random() < 0.5 ? -1 : 1) * driftSpeed;
      vy = 0;
    } else {
      const angle = randRange(0, Math.PI * 2);
      vx = Math.cos(angle) * driftSpeed;
      vy = Math.sin(angle) * driftSpeed;
    }
    return {
      id: nextId(),
      text,
      isCorrect: i === correctIdx,
      x: positions[i].x,
      y: positions[i].y,
      vx,
      vy,
      width: blockWidth,
      height: m.height,
      fontPx: m.fontPx,
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
    const halfH = b.height / 2;
    if (b.x - halfW < ANSWER_BLOCK_EDGE_MARGIN_PX) {
      b.x = ANSWER_BLOCK_EDGE_MARGIN_PX + halfW;
      b.vx = Math.abs(b.vx);
    } else if (b.x + halfW > width - ANSWER_BLOCK_EDGE_MARGIN_PX) {
      b.x = width - ANSWER_BLOCK_EDGE_MARGIN_PX - halfW;
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
  const halfH = b.height / 2;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.scale(scale, scale);

  // Chromatic-aberration ghosting on every block, escalating with the streak.
  if (camoIntensity > 0) {
    const off = camoIntensity * CONFIG.ESCALATION_CHROMATIC_MAX_PX;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ff3b3b";
    roundRectPath(ctx, -halfW - off, -halfH, b.width, b.height, 12);
    ctx.fill();
    ctx.fillStyle = "#39d6ff";
    roundRectPath(ctx, -halfW + off, -halfH, b.width, b.height, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // glow
  ctx.fillStyle = glowGradient(ctx, halfW);
  ctx.beginPath();
  ctx.arc(0, 0, halfW * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = BLOCK_BODY_FILL;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = shadowBlurPx(flickering ? 22 : 16);
  ctx.lineWidth = 3;
  roundRectPath(ctx, -halfW, -halfH, b.width, b.height, 14);
  ctx.fill();
  ctx.stroke();

  // remaining-time bar
  ctx.shadowBlur = 0;
  ctx.fillStyle = TIMER_BAR_TRACK;
  ctx.fillRect(-halfW, halfH + 7, b.width, 4);
  ctx.fillStyle = TIMER_BAR_FILL;
  ctx.fillRect(-halfW, halfH + 7, b.width * remaining, 4);

  // text — always a stable, readable color regardless of camouflage state
  ctx.shadowBlur = shadowBlurPx(flickering ? 10 : 6);
  ctx.shadowColor = color;
  ctx.fillStyle = BLOCK_TEXT_FILL;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = blockFont(b.fontPx);
  // maxWidth guarantees a long option is condensed to fit rather than
  // spilling outside the block, since block width is clamped no matter how
  // long the text is.
  ctx.fillText(b.text, 0, 1, b.width * 0.9);

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

/** The block glow, keyed by half-width. Blocks share widths constantly —
 * the clamp lands most long options on exactly ANSWER_BLOCK_MAX_WIDTH — so
 * a handful of gradients serves every block in the round. */
function glowGradient(ctx: CanvasRenderingContext2D, halfW: number): CanvasGradient {
  const radius = Math.round(halfW);
  return cachedGradient(ctx, `block:${radius}`, (c) => {
    const g = c.createRadialGradient(0, 0, 4, 0, 0, radius * 1.5);
    g.addColorStop(0, GLOW_INNER);
    g.addColorStop(1, GLOW_OUTER);
    return g;
  });
}

function withAlpha(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

