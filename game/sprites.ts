import { backingScale } from "./quality";

/**
 * Pre-scaled copies of the illustrated PNGs.
 *
 * The cinematic and illusion art is authored at 1024x1024 (and 848x1264 for
 * the server frames) but lands on screen at a fraction of that — a drifting
 * virus is 50-150px. Passing the source image straight to `drawImage` with
 * a destination that small makes the browser resample the full million-pixel
 * source every single frame, per sprite, with no mipmap chain to fall back
 * on. It is one of the most expensive things a 2D canvas can be asked to do,
 * and on a mid-range phone six of them is most of a frame budget.
 *
 * Scaling once into an offscreen canvas and blitting that instead turns the
 * per-frame cost into a near 1:1 copy. The copy is made at device pixels,
 * not CSS pixels, so nothing gets softer than it was.
 */

/** Cache sizes are rounded up to a multiple of this, so a sprite that
 * drifts through a range of sizes reuses one copy instead of forcing a
 * re-scale every frame. */
const SIZE_BUCKET_PX = 64;

const cache = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>();

/**
 * A copy of `img` sized for drawing at `displayPx` CSS pixels, or `null` if
 * the image has not finished loading (callers should skip drawing).
 *
 * Falls through to the source image when the source is already no larger
 * than the copy would be — there is nothing to gain from duplicating it.
 */
export function scaledSprite(
  img: HTMLImageElement | undefined,
  displayPx: number,
): HTMLImageElement | HTMLCanvasElement | null {
  if (!img || !img.complete || img.naturalWidth === 0) return null;

  const devicePx = Math.max(1, Math.ceil((displayPx * backingScale()) / SIZE_BUCKET_PX) * SIZE_BUCKET_PX);
  if (devicePx >= img.naturalWidth) return img;

  let bySize = cache.get(img);
  if (!bySize) {
    bySize = new Map();
    cache.set(img, bySize);
  }
  const hit = bySize.get(devicePx);
  if (hit) return hit;

  const aspect = img.naturalHeight / img.naturalWidth;
  const canvas = document.createElement("canvas");
  canvas.width = devicePx;
  canvas.height = Math.max(1, Math.round(devicePx * aspect));
  const ctx = canvas.getContext("2d");
  // A context can legitimately fail (memory pressure on a low-end phone).
  // Falling back to the source image costs speed, not correctness.
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  bySize.set(devicePx, canvas);
  return canvas;
}
