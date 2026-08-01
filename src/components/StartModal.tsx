import type { GameSize } from "@/lib/sizes";
import type { Mode } from "@/lib/storage";
import type { DailyResults } from "@/lib/dailyStorage";
import type { Theme } from "@/hooks/useTheme";
import { formatDayLong } from "@/lib/daily";
import { formatDuration } from "@/lib/timer";
import { Modal } from "./Modal";
import { SizeChips } from "./SizeChips";
import { ThemeToggle } from "./ThemeToggle";
import { StripDecoration } from "./StripDecoration";
import { WordSample } from "./WordSample";
import "./Sheet.css";

export type RunningGame = {
  mode: Mode;
  groups: number;
  wordsPerGroup: number;
  completedCount: number;
  categoryCount: number;
  /** Daily only — frozen, because the clock is paused while this is open. */
  elapsedMs?: number;
};

type Props = {
  /** Today's date in Oslo, as YYYY-MM-DD. */
  today: string;
  dailyResults: DailyResults;
  /** The game to offer to return to, or null when none is in progress. */
  running: RunningGame | null;
  /** Whether there is a board behind this sheet at all — a finished game
   *  counts, and must still be reachable by closing. */
  dismissable: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onStart: (mode: Mode, size: GameSize) => void;
  onClose: () => void;
};

/**
 * The app's only menu.
 *
 * It is shown cold on the first visit and again whenever the player presses
 * "Nytt spill", which means it has to make sense to someone who has never seen
 * the game *and* to someone who is nine categories into a board. The two are
 * reconciled by ordering rather than by branching: mid-game it leads with the
 * game you are already in, and the instructions stay where they were going to
 * be anyway — at the bottom, out of the way of someone who knows them.
 */
export function StartModal({
  today,
  dailyResults,
  running,
  dismissable,
  theme,
  onThemeChange,
  onStart,
  onClose,
}: Props) {
  const current = running
    ? { mode: running.mode, groups: running.groups, wordsPerGroup: running.wordsPerGroup }
    : null;

  return (
    <Modal ariaLabel="Taksonomi" bleed onClose={dismissable ? onClose : undefined}>
      <div className="sheet">
        <StripDecoration />
        <div className="sheet__body">
          <div className="sheet__top">
            <h2 className="sheet__wordmark">Taksonomi</h2>
            <div className="sheet__top-controls">
              <ThemeToggle theme={theme} onChange={onThemeChange} />
              {dismissable && (
                <button type="button" className="sheet__close" aria-label="Lukk" onClick={onClose}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {running && (
            <div className="sheet__resume">
              <div className="sheet__resume-row">
                <span className="sheet__resume-what">
                  {running.mode === "daily" ? "Dagens" : "Fritt spill"} {running.groups}×
                  {running.wordsPerGroup}
                </span>
                {running.elapsedMs !== undefined && (
                  <span className="sheet__clock">{formatDuration(running.elapsedMs)}</span>
                )}
              </div>
              <div className="sheet__resume-row">
                <span className="sheet__note">
                  {running.completedCount} av {running.categoryCount} kategorier løst.
                </span>
                {running.elapsedMs !== undefined && <span className="sheet__paused">Pauset</span>}
              </div>
              <button type="button" className="sheet__action" onClick={onClose}>
                Fortsett
              </button>
            </div>
          )}

          <section className="sheet__block">
            <h3 className="sheet__heading">{formatDayLong(today)}</h3>
            <p className="sheet__desc">Dagens brett — likt for alle, og klokka går.</p>
            <SizeChips
              mode="daily"
              results={dailyResults}
              current={current}
              onPick={(size) => onStart("daily", size)}
            />
          </section>

          <section className="sheet__block">
            <h3 className="sheet__heading">Spill fritt</h3>
            <SizeChips mode="free" current={current} onPick={(size) => onStart("free", size)} />
            {running && (
              <p className="sheet__note">Starter du noe nytt, avsluttes det som pågår.</p>
            )}
          </section>

          <section className="sheet__block">
            <h3 className="sheet__heading">Slik spiller du</h3>
            <ul className="sheet__rules">
              <li>Slå sammen ord som hører til samme kategori.</li>
              <li>Velg to ord, eller dra det ene oppå det andre.</li>
              <li>Fullfør alle kategoriene for å vinne.</li>
            </ul>
            <WordSample />
          </section>
        </div>
      </div>
    </Modal>
  );
}
