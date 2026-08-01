import { rngFor } from "./rng";

/**
 * The daily challenge: one board per size per day, identical for everyone.
 *
 * Shared by the server (which picks the categories) and the client (which lays
 * them out and labels them), so the two cannot disagree about which day it is
 * or which board that day has.
 */

/** Every player gets a new board at the same moment, wherever they are. */
const ZONE = "Europe/Oslo";

/** Today's date in Oslo as YYYY-MM-DD. `en-CA` is ISO-shaped by definition. */
export function dayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(now);
}

/** The seed string for one day's board at one size. */
export function dailySeed(date: string, groups: number, wordsPerGroup: number): string {
  return `taksonomi:${date}:${groups}x${wordsPerGroup}`;
}

/** Picks the categories and the words within them. Server side. */
export function boardRng(date: string, groups: number, wordsPerGroup: number): () => number {
  return rngFor(dailySeed(date, groups, wordsPerGroup));
}

/**
 * Shuffles the opening tile order. A separate stream from `boardRng`, not the
 * same one continued: the client never runs the board draw, so sharing a
 * stream would mean the two sides are at different positions in it.
 *
 * This one matters more than it looks. The server can be perfectly
 * deterministic and the challenge still be unfair if every player opens on a
 * different arrangement of the same words.
 */
export function layoutRng(date: string, groups: number, wordsPerGroup: number): () => number {
  return rngFor(`${dailySeed(date, groups, wordsPerGroup)}:layout`);
}

/** Seconds until the next Oslo midnight — how long today's board stays valid. */
export function secondsUntilNextDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Under hour12: false some engines render midnight as hour 24.
  const elapsed = (num("hour") % 24) * 3600 + num("minute") * 60 + num("second");
  return 86400 - elapsed;
}

/** "Torsdag 30. juli" — the heading of the daily block. */
export function formatDayLong(date: string): string {
  const text = new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ZONE,
  }).format(parseDay(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "30.07" — the compact form used in the shared result. */
export function formatDayShort(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

/** Midday UTC, so the calendar date survives any zone offset on the way back. */
function parseDay(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}
