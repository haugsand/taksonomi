import { useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";
import type { Category } from "@/lib/types";
import { formatDayLong } from "@/lib/daily";
import { formatDuration } from "@/lib/timer";
import { shareText } from "@/lib/share";
import { CompletedBoard } from "./CompletedBoard";
import { ShareButton } from "./ShareButton";
import "./CompletedView.css";

type Props = {
  categories: Category[];
  rowCount: number;
  boardRef: RefObject<HTMLDivElement>;
  groups: number;
  wordsPerGroup: number;
  /** Whether the categories have been revealed yet — see Game.tsx. */
  categoriesShown: boolean;
  /** Daily only. Absent for free play, which has no time and nothing to share. */
  elapsedMs?: number;
  date?: string;
};

/**
 * The finished game.
 *
 * This replaces a modal, and the reason is worth keeping: that modal was doing
 * two jobs at once. It *marked the moment*, which is by nature fleeting, and it
 * *held the result*, which has to last. Sharing the day's time lived in the
 * fleeting one, so dismissing the modal to look at the board threw the share
 * button away for good.
 *
 * Here the two are separated. The board becoming the result is the moment; the
 * result then stays above the categories for as long as the game is on screen.
 * Nothing has to be pressed to see what you solved, and nothing can be closed.
 */
export function CompletedView({
  categories,
  rowCount,
  boardRef,
  groups,
  wordsPerGroup,
  categoriesShown,
  elapsedMs,
  date,
}: Props) {
  const headingRef = useRef<HTMLParagraphElement>(null);
  const isDaily = elapsedMs !== undefined && date !== undefined;

  // The tile the player just merged is gone, and focus went with it. The modal
  // used to catch it by trapping; without one it has to be placed deliberately,
  // or a keyboard user is left at the top of the document.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="completed">
      <div className="completed__hero">
        <p className="completed__headline" tabIndex={-1} ref={headingRef}>
          {isDaily ? formatDuration(elapsedMs) : "Fullført!"}
        </p>
        <p className="completed__meta">
          {isDaily
            ? `Dagens ${groups}×${wordsPerGroup} · ${formatDayLong(date).toLowerCase()}`
            : `Du løste alle ${categories.length} kategoriene.`}
        </p>
        {isDaily && (
          <div className="completed__share">
            <ShareButton text={shareText(groups, wordsPerGroup, date, elapsedMs)} />
          </div>
        )}
      </div>

      {categoriesShown && (
        <div className="completed__categories">
          <CompletedBoard categories={categories} rowCount={rowCount} boardRef={boardRef} />
        </div>
      )}
    </div>
  );
}
