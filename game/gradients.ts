/**
 * A shared cache for canvas gradients.
 *
 * Building a gradient allocates an object and evaluates a colour ramp, and
 * the ones in this game are almost all rebuilt every frame from arguments
 * that never change: the answer-block glow, the mascot's aura, the prize
 * note's shimmer, the illusion vignette. They are defined in their own
 * translated local space — centred on (0, 0) — so for a given size and
 * colour the result is identical frame after frame.
 *
 * Keys must therefore encode everything the gradient's geometry and stops
 * depend on, and anything continuously varying has to be bucketed by the
 * caller or the cache grows without bound.
 */

/** A CanvasGradient belongs to the context that created it, and the engine
 * builds a fresh context if the canvas is remounted — so the whole cache is
 * dropped when the context changes rather than handing back gradients that
 * belong to a dead canvas. */
let cacheCtx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, CanvasGradient>();

export function cachedGradient(
  ctx: CanvasRenderingContext2D,
  key: string,
  build: (ctx: CanvasRenderingContext2D) => CanvasGradient,
): CanvasGradient {
  if (cacheCtx !== ctx) {
    cacheCtx = ctx;
    cache.clear();
  }
  let gradient = cache.get(key);
  if (!gradient) {
    gradient = build(ctx);
    cache.set(key, gradient);
  }
  return gradient;
}
