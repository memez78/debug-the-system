import { CONFIG } from "./config";
import { TECH_QUESTIONS } from "./questions/tech";
import type { Question } from "./types";
import { randInt } from "./utils";

/** Rolling history of recently-asked question ids, so the same question
 * doesn't repeat back-to-back (or within a few questions) in one sitting. */
const recentIds: string[] = [];

/** Picks the next question. The pool is IT/tech only — the joke questions
 * were cut deliberately; they broke the tone of the booth game. */
export function pickNextQuestion(): Question {
  const eligible = TECH_QUESTIONS.filter((q) => !recentIds.includes(q.id));
  const choices = eligible.length > 0 ? eligible : TECH_QUESTIONS;
  const q = choices[randInt(0, choices.length - 1)];
  recentIds.push(q.id);
  if (recentIds.length > CONFIG.QUESTION_HISTORY_SIZE) recentIds.shift();
  return q;
}
