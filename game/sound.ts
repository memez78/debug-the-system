import { CONFIG } from "./config";

/**
 * All game audio, synthesised at runtime with the Web Audio API.
 *
 * There are no sound files in this project on purpose. Short synthesised
 * blips are the honest texture for an arcade cabinet, and doing it this way
 * means nothing to download, nothing to license, no load delay before the
 * first sound, and every tone is a number you can tune in CONFIG rather than
 * an asset you have to re-record.
 *
 * Two rules the browser imposes, both handled here:
 *  - An AudioContext created before a user gesture starts suspended and
 *    stays silent. So the context is built lazily on the first tap, via
 *    unlock(), and resumed if it was suspended.
 *  - Every method must be safe to call when audio is unavailable, muted, or
 *    blocked. They all no-op rather than throw, so a missing AudioContext
 *    can never take the game down with it.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  /** Called from a real user gesture (the first pointerdown). Safe to call
   * repeatedly — it builds the context once and resumes it if suspended. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : CONFIG.SOUND_MASTER_VOLUME;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** @returns the new muted state. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : CONFIG.SOUND_MASTER_VOLUME, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  /** Audio-clock "now". Null when there is nothing to play through. */
  private at(): number | null {
    if (!this.ctx || !this.master || this.muted) return null;
    return this.ctx.currentTime;
  }

  /**
   * One enveloped oscillator. Gain is ramped exponentially from and back to
   * a floor rather than to zero, because exponential ramps to 0 are invalid
   * and produce a click.
   */
  private tone(
    start: number,
    fromHz: number,
    toHz: number,
    durSec: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, fromHz), start);
    if (Math.abs(toHz - fromHz) > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), start + durSec);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.min(0.012, durSec * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durSec);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + durSec + 0.03);
  }

  /** Filtered white-noise burst — used for impacts, where a pure tone reads
   * as a beep rather than as something breaking. */
  private burst(start: number, durSec: number, peak: number, cutoffHz: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (!this.noise) {
      const frames = Math.floor(ctx.sampleRate * 0.4);
      this.noise = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoffHz, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durSec);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + durSec + 0.02);
  }

  // ---- Cues ---------------------------------------------------------------

  /** Advancing a line of dialogue. Deliberately tiny — it fires on every tap
   * through the intro, so anything with a tail would grate by line three. */
  dialogue(): void {
    const t = this.at();
    if (t === null) return;
    this.tone(t, 900, 1180, 0.05, "square", 0.07);
  }

  /** A captioned beat ("INFECTION DETECTED"). Reads as an alert, not a blip. */
  caption(): void {
    const t = this.at();
    if (t === null) return;
    this.tone(t, 520, 520, 0.1, "sawtooth", 0.09);
    this.tone(t + 0.11, 392, 392, 0.22, "sawtooth", 0.09);
  }

  /** Round begins. Ascending major triad — the one unambiguously "go" sound. */
  roundStart(): void {
    const t = this.at();
    if (t === null) return;
    [523.25, 659.25, 783.99].forEach((hz, i) => this.tone(t + i * 0.09, hz, hz, 0.16, "triangle", 0.11));
  }

  /** Answer options have appeared and the clock is live. */
  answersUp(): void {
    const t = this.at();
    if (t === null) return;
    this.tone(t, 700, 900, 0.06, "triangle", 0.05);
  }

  /**
   * Correct answer. Pitch climbs with the streak so a run *sounds* like it is
   * building — capped so a long streak stays musical instead of shrill.
   */
  correct(streak: number): void {
    const t = this.at();
    if (t === null) return;
    const step = Math.min(streak, 12);
    const root = 440 * Math.pow(2, step / 12);
    this.tone(t, root, root, 0.08, "square", 0.1);
    this.tone(t + 0.07, root * 1.5, root * 1.5, 0.14, "square", 0.1);
  }

  /** Wrong answer: a short descending buzz. */
  wrong(): void {
    const t = this.at();
    if (t === null) return;
    this.tone(t, 320, 150, 0.2, "sawtooth", 0.11);
  }

  /** Second wrong tap — the question is abandoned. Heavier than a miss. */
  questionFailed(): void {
    const t = this.at();
    if (t === null) return;
    this.burst(t, 0.22, 0.16, 900);
    this.tone(t, 180, 90, 0.3, "square", 0.1);
  }

  /** Every option timed out unanswered. Dull, not punishing. */
  timeout(): void {
    const t = this.at();
    if (t === null) return;
    this.tone(t, 300, 220, 0.16, "sine", 0.07);
  }

  /** One-per-second beep over the closing seconds of a round. */
  urgentTick(): void {
    const t = this.at();
    if (t === null) return;
    this.tone(t, 1000, 1000, 0.06, "square", 0.08);
  }

  /** Mid-round reward scene. */
  interlude(): void {
    const t = this.at();
    if (t === null) return;
    [659.25, 783.99, 1046.5].forEach((hz, i) => this.tone(t + i * 0.1, hz, hz, 0.24, "triangle", 0.1));
  }

  /** Cracking the server open. */
  win(): void {
    const t = this.at();
    if (t === null) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((hz, i) =>
      this.tone(t + i * 0.13, hz, hz, 0.34, "square", 0.11),
    );
  }

  /** Losing the robot to the void. */
  lose(): void {
    const t = this.at();
    if (t === null) return;
    [392, 349.23, 293.66].forEach((hz, i) => this.tone(t + i * 0.2, hz, hz, 0.5, "triangle", 0.1));
    this.burst(t + 0.5, 0.7, 0.09, 500);
  }
}
