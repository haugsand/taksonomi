import "./ProgressBar.css";

type Props = {
  tileCount: number;
  groupCount: number;
  wordsPerGroup: number;
};

export function ProgressBar({ tileCount, groupCount, wordsPerGroup }: Props) {
  const max = groupCount * wordsPerGroup;
  const min = groupCount;
  const denom = Math.max(1, max - min);
  const raw = (max - tileCount) / denom;
  const pct = Math.max(0, Math.min(1, raw)) * 100;
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
