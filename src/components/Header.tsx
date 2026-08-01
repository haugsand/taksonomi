import type { Ref } from "preact";
import { formatDuration } from "@/lib/timer";
import { ProgressBar } from "./ProgressBar";
import "./Header.css";

type Props = {
  groupCount: number;
  wordsPerGroup: number;
  completedCount: number;
  tileCount: number;
  /** Set only while a daily challenge is running. Its presence is what tells
   *  the player which mode they are in — free play has no clock, so a second
   *  badge saying "daily" would only repeat what the number already says. */
  elapsedMs?: number;
  onOpenMenu: () => void;
  /** Attached to the <header> so Game can measure its height and reserve room
   *  for it below the fixed bar. */
  headerRef?: Ref<HTMLElement>;
};

export function Header({
  groupCount,
  wordsPerGroup,
  completedCount,
  tileCount,
  elapsedMs,
  onOpenMenu,
  headerRef,
}: Props) {
  return (
    <header className="header" ref={headerRef}>
      {/* The visible wordmark lives in the start sheet, which is gone once a
          game is running — leaving the document with no h1 at all. */}
      <h1 className="sr-only">Taksonomi</h1>
      <ProgressBar tileCount={tileCount} groupCount={groupCount} wordsPerGroup={wordsPerGroup} />
      <div className="header__bar">
        <p className="header__progress">
          {completedCount} av {groupCount} kategorier fullført
        </p>
        <div className="header__controls">
          {elapsedMs !== undefined && (
            // Deliberately not a live region. A clock that announces itself
            // every second makes the board unusable with a screen reader; the
            // finished time is announced by the completion sheet instead.
            <p className="header__clock">
              <span className="sr-only">Tid: </span>
              {formatDuration(elapsedMs)}
            </p>
          )}
          {/* One button, no caret: it opens the start sheet, not a dropdown
              under itself. The popover this replaces listed all eight sizes in
              a 5rem column and hand-rolled its own focus handling; the sheet
              already owns that list, and <dialog> already owns the focus. */}
          <button type="button" className="header__button" onClick={onOpenMenu}>
            Nytt spill
          </button>
        </div>
      </div>
    </header>
  );
}
