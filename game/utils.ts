export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/** Fisher-Yates shuffle, returns a new array (input is untouched). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let idCounter = 1;
export function nextId(): number {
  return idCounter++;
}
