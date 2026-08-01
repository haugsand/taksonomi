import { useEffect, useRef, useState } from "preact/hooks";
import type { GameSize } from "@/lib/sizes";
import type { Mode } from "@/lib/storage";
import type { DailyResults } from "@/lib/dailyStorage";
import { formatDayLong } from "@/lib/daily";
import { formatDuration } from "@/lib/timer";
import { shareResult, shareText, type ShareOutcome } from "@/lib/share";
import { Modal } from "./Modal";
import { SizeChips } from "./SizeChips";
import { StripDecoration } from "./StripDecoration";
import "./Sheet.css";

type Props = {
  mode: Mode;
  groups: number;
  wordsPerGroup: number;
  categoryCount: number;
  dailyResults: DailyResults;
  /** Daily only: the finished time, and the day the board belonged to. */
  elapsedMs?: number;
  date?: string;
  onShowAll: () => void;
  onStart: (mode: Mode, size: GameSize) => void;
};

/** How long the button holds the outcome before offering the action again. */
const OUTCOME_MS = 2600;

function CopyIcon() {
  return (
    <svg className="sheet__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="sheet__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

/**
 * Shown when the last category is solved. Dismissable — closing reveals the
 * finished board.
 *
 * The two modes end differently on purpose. A daily board is the same one
 * everybody played, so it has a time worth comparing and worth sharing. A free
 * board is randomly drawn and comparable to nothing, so it has neither, and the
 * reward is the thing it always was: seeing every category you solved.
 */
export function CompletionModal({
  mode,
  groups,
  wordsPerGroup,
  categoryCount,
  dailyResults,
  elapsedMs,
  date,
  onShowAll,
  onStart,
}: Props) {
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isDaily = mode === "daily" && elapsedMs !== undefined && date !== undefined;
  const text = isDaily ? shareText(groups, wordsPerGroup, date, elapsedMs) : "";

  useEffect(() => () => clearTimeout(resetRef.current), []);

  async function share() {
    const result = await shareResult(text);
    setOutcome(result);
    // Hand the button back afterwards. Left as-is it reports an event that has
    // stopped being true and no longer looks pressable.
    clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => setOutcome(null), OUTCOME_MS);
  }

  // The result belongs *in* the button. Beside it, the only thing that changed
  // when you pressed was a line of small print somewhere else on the sheet, and
  // a clipboard write is otherwise completely silent.
  const shareLabel =
    outcome === "copied"
      ? "Kopiert til utklippstavla"
      : outcome === "shared"
        ? "Delt"
        : outcome === "failed"
          ? "Kunne ikke dele"
          : "Del resultat";
  const shareDone = outcome === "copied" || outcome === "shared";

  return (
    <Modal ariaLabel="Spill fullført" onClose={onShowAll} bleed>
      <div className="sheet">
        <StripDecoration />
        <div className="sheet__body">
          <div className="sheet__block">
            <h2 className="sheet__wordmark">Fullført!</h2>
            <p className="sheet__desc">
              {isDaily
                ? `Dagens ${groups}×${wordsPerGroup} · ${formatDayLong(date).toLowerCase()}`
                : `Du løste alle ${categoryCount} kategoriene.`}
            </p>
          </div>

          {isDaily && (
            <div className="sheet__block">
              <p className="sheet__time">{formatDuration(elapsedMs)}</p>
              <pre className="sheet__share-preview">{text}</pre>
            </div>
          )}

          <div className="sheet__actions">
            {isDaily && (
              <button type="button" className="sheet__action" onClick={share}>
                {shareDone ? <CheckIcon /> : <CopyIcon />}
                {shareLabel}
              </button>
            )}
            <button
              type="button"
              className={isDaily ? "sheet__action sheet__action--quiet" : "sheet__action"}
              onClick={onShowAll}
            >
              Se alle fullførte kategorier
            </button>
            {/* A changed button label is not announced on its own, so the same
                message goes out through a live region as well. */}
            <p className="sr-only" role="status">
              {outcome === "copied" && "Kopiert til utklippstavla."}
              {outcome === "shared" && "Resultatet er delt."}
              {outcome === "failed" && "Kunne ikke dele. Kopier teksten over."}
            </p>
          </div>

          <section className="sheet__block">
            <h3 className="sheet__heading">Flere utfordringer</h3>
            <SizeChips
              mode="daily"
              results={dailyResults}
              onPick={(size) => onStart("daily", size)}
            />
          </section>

          {!isDaily && (
            <section className="sheet__block">
              <h3 className="sheet__heading">Spill fritt</h3>
              <SizeChips mode="free" onPick={(size) => onStart("free", size)} />
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}
