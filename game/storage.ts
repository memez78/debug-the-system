import { CONFIG } from "./config";
import type { LeaderboardEntry } from "./types";

/**
 * All localStorage access goes through here and is guarded (§9 robustness):
 * private browsing, storage-full, or storage-disabled must never crash the
 * game — they just make the leaderboard silently a no-op.
 */

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `debug-the-system:leaderboard:${yyyy}-${mm}-${dd}`;
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getTodaysLeaderboard(): LeaderboardEntry[] {
  const raw = safeGetItem(todayKey());
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLeaderboardEntry).slice(0, CONFIG.LEADERBOARD_SIZE);
  } catch {
    return [];
  }
}

function isLeaderboardEntry(v: unknown): v is LeaderboardEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.name === "string" &&
    typeof e.score === "number" &&
    typeof e.ts === "number"
  );
}

/** Would this score crack today's top N? Read fresh so it's accurate even
 * if another tab/round wrote in the meantime. */
export function qualifiesForLeaderboard(score: number): boolean {
  const current = getTodaysLeaderboard();
  if (current.length < CONFIG.LEADERBOARD_SIZE) return score > 0;
  return score > current[current.length - 1].score;
}

/** Re-reads, inserts, sorts, trims, and writes back — minimizes lost-update
 * risk if something else touched the key between read and write. */
export function addLeaderboardEntry(name: string, score: number): LeaderboardEntry[] {
  const cleanName = sanitizeName(name);
  const current = getTodaysLeaderboard();
  const next = [...current, { name: cleanName, score, ts: Date.now() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.LEADERBOARD_SIZE);
  safeSetItem(todayKey(), JSON.stringify(next));
  return next;
}

export function sanitizeName(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  const stripped = trimmed.replace(/[^A-Z0-9 ]/g, "");
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  return (collapsed || "PLAYER").slice(0, CONFIG.NAME_MAX_LEN);
}
