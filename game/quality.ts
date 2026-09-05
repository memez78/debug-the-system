import { CONFIG } from "./config";

/**
 * How expensively the scene is allowed to be painted.
 *
 * A booth kiosk and a mid-range phone are not the same machine, and the
 * effects that carry this game's look — a scene-wide canvas `filter:
 * blur()`, shadowed fills, a screenful of digital rain — are exactly the
 * ones a mobile GPU charges most for. Rather than pick one setting for
 * both, the engine starts from what the device advertises and then keeps
 * watching real frame times, dropping to the cheap tier if the frames say
 * so.
 *
 * **Nothing here touches gameplay.** Every difficulty input — answer
 * window, drift speed, option count, and the flicker/jitter/chromatic
 * camouflage — is identical in both tiers, and no effect in either tier
 * varies with whether a block is the correct answer. The one thing a
 * player could notice is that the scene-wide blur over the answer blocks
 * is dropped on the low tier: it is the single most expensive draw in the
 * frame (see the note on `canvasBlur` below), and it is the mildest of the
 * five camouflage effects, all of which still apply.
 */
export type QualityTier = "high" | "low";

export interface QualitySettings {
  tier: QualityTier;
  /** Cap applied to `devicePixelRatio` when sizing the backing store. A 3x
   * phone at 412x915 CSS px is a 1.5-million-pixel canvas at 2x; every
   * full-screen fill in the frame is paid per pixel. */
  dprCap: number;
  /** Whether `ctx.filter = blur(...)` over the answer blocks is affordable.
   * Setting `ctx.filter` makes the browser render each subsequent draw call
   * into a scratch surface and blur it — with 4 blocks at ~8 draws each,
   * that is over 30 offscreen buffers per frame. */
  canvasBlur: boolean;
  /** Multiplier on every `ctx.shadowBlur` radius; 0 disables canvas shadows
   * outright. The blocks and the mascot also carry a radial-gradient glow,
   * so the neon look survives without them. */
  shadowScale: number;
  /** Multiplier on digital-rain column density and trail length. */
  rainScale: number;
}

function settingsFor(tier: QualityTier): QualitySettings {
  return tier === "high"
    ? {
        tier,
        dprCap: CONFIG.QUALITY_DPR_CAP_HIGH,
        canvasBlur: true,
        shadowScale: CONFIG.QUALITY_SHADOW_SCALE_HIGH,
        rainScale: CONFIG.QUALITY_RAIN_SCALE_HIGH,
      }
    : {
        tier,
        dprCap: CONFIG.QUALITY_DPR_CAP_LOW,
        canvasBlur: false,
        shadowScale: CONFIG.QUALITY_SHADOW_SCALE_LOW,
        rainScale: CONFIG.QUALITY_RAIN_SCALE_LOW,
      };
}

/**
 * Live render settings. A single mutable object rather than a value passed
 * down through every draw call: the draw path is deep (engine → mascot →
 * thruster, engine → answer blocks, engine → illusion) and threading a
 * settings argument through all of it would be a lot of plumbing for
 * something that changes at most once in a session.
 */
export const RENDER_QUALITY: QualitySettings = settingsFor("high");

/**
 * The scale factor between CSS pixels and the canvas backing store.
 *
 * Everything that sizes a buffer reads it from here rather than from
 * `devicePixelRatio` directly, so the tier's cap is applied in one place
 * and the pre-scaled sprites can never disagree with the canvas they are
 * drawn into.
 */
export function backingScale(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, RENDER_QUALITY.dprCap);
}

/** `px` scaled by the current tier's shadow budget. Every `ctx.shadowBlur`
 * in the codebase goes through this, so the tier can switch shadows off in
 * one place instead of each draw routine remembering to check. */
export function shadowBlurPx(px: number): number {
  return px * RENDER_QUALITY.shadowScale;
}

/**
 * The tier to start on, from what the device tells us before a single frame
 * has been drawn.
 *
 * A coarse pointer alone is not enough — the kiosk this game was built for
 * is a touchscreen too, and it is a full desktop GPU behind a full-size
 * screen. It is coarse pointer *plus* a small viewport that means a phone.
 */
function detectTier(): QualityTier {
  if (typeof window === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < CONFIG.QUALITY_SMALL_SCREEN_PX;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= CONFIG.QUALITY_LOW_CORE_COUNT;
  const lowMemory = (nav.deviceMemory ?? 8) <= CONFIG.QUALITY_LOW_MEMORY_GB;
  return (coarse && smallScreen) || fewCores || lowMemory ? "low" : "high";
}

/**
 * Watches real frame times and drops the tier when they say the device
 * cannot keep up.
 *
 * Downgrade only, once. Letting it climb back up would mean the cost that
 * caused the downgrade returns, frames get slow again, and the renderer
 * oscillates between two looks for the rest of the round — worse to play
 * than either tier on its own.
 */
export class QualityGovernor {
  private samples: number[] = [];
  private settled = false;

  /** Sets the opening tier and returns it. Call once, before the first frame. */
  start(): QualitySettings {
    Object.assign(RENDER_QUALITY, settingsFor(detectTier()));
    if (RENDER_QUALITY.tier === "low") this.settled = true;
    return RENDER_QUALITY;
  }

  /**
   * Feeds one frame's real duration in.
   *
   * @param frameMs wall-clock ms since the previous frame — the *real*
   *   elapsed time, not the dt-clamped engine delta, since the whole point
   *   is to notice frames that ran long.
   * @returns true on the frame the tier changed, so the caller can re-apply
   *   anything derived from it (the canvas backing store is sized from
   *   `dprCap`, so it has to be rebuilt).
   */
  sample(frameMs: number): boolean {
    if (this.settled) return false;
    // A frame that ran absurdly long is a stall — a tab regaining focus, a
    // GC pause, the first paint after a phase change — not a steady-state
    // cost, and letting one into the median would condemn a fast device.
    if (frameMs > CONFIG.QUALITY_STALL_FRAME_MS) return false;
    this.samples.push(frameMs);
    if (this.samples.length < CONFIG.QUALITY_SAMPLE_FRAMES) return false;

    this.samples.sort((a, b) => a - b);
    const median = this.samples[this.samples.length >> 1];
    this.samples = [];
    if (median <= CONFIG.QUALITY_DOWNGRADE_FRAME_MS) return false;

    this.settled = true;
    Object.assign(RENDER_QUALITY, settingsFor("low"));
    return true;
  }
}
