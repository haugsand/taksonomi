import "./ProgressBar.css";

type Props = {
  tileCount: number;
  groupCount: number;
  wordsPerGroup: number;
};

/**
 * How far the board has been merged: from `groups × wordsPerGroup` separate
 * tiles down to one tile per category.
 *
 * This measures *words merged*, not categories solved — the header text beside
 * it reports the latter. They are genuinely different numbers, which is why the
 * bar carries its own accessible name instead of being hidden from assistive
 * tech as a duplicate of that text.
 */
export function ProgressBar({ tileCount, groupCount, wordsPerGroup }: Props) {
  // No tiles means no game yet (the start modal is up). The formula below would
  // divide the full span by itself and report a triumphant 100%, so render
  // nothing rather than a full bar behind the start screen.
  if (tileCount === 0) return null;

  const max = groupCount * wordsPerGroup;
  const min = groupCount;
  const denom = Math.max(1, max - min);
  const raw = (max - tileCount) / denom;
  const pct = Math.max(0, Math.min(1, raw)) * 100;
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label="Ord slått sammen"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
