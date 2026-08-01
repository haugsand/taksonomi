import { GAME_SIZES, type GameSize } from "@/lib/sizes";
import { sizeKey, type DailyResults } from "@/lib/dailyStorage";
import { formatDuration } from "@/lib/timer";
import type { Mode } from "@/lib/storage";

type Props = {
  mode: Mode;
  onPick: (size: GameSize) => void;
  /** Daily only: sizes already finished today, and how long they took. */
  results?: DailyResults;
  /** The game in progress, marked in whichever of the two lists it belongs to. */
  current?: { mode: Mode; groups: number; wordsPerGroup: number } | null;
};

/**
 * The size list. The same control in both blocks — identical shape, identical
 * size — because it is the same choice; only the container around it differs.
 * Giving the two lists separate styling would be decoration that lies about
 * what they are.
 */
export function SizeChips({ mode, onPick, results, current }: Props) {
  return (
    <div className="sheet__sizes">
      {GAME_SIZES.map((s) => {
        const done = mode === "daily" ? results?.[sizeKey(s.groups, s.wordsPerGroup)] : undefined;
        const isCurrent =
          current?.mode === mode &&
          current.groups === s.groups &&
          current.wordsPerGroup === s.wordsPerGroup;

        const classes = ["size-chip"];
        if (mode === "free") classes.push("size-chip--free");
        if (done !== undefined) classes.push("size-chip--done");
        if (isCurrent) classes.push("size-chip--current");

        const dimensions = `${s.groups} ganger ${s.wordsPerGroup}`;
        const label =
          done !== undefined
            ? `${dimensions}, fullført på ${formatDuration(done)}`
            : isCurrent
              ? `${dimensions}, pågår`
              : dimensions;

        return (
          <button
            key={s.label}
            type="button"
            className={classes.join(" ")}
            // A finished challenge is finished. Letting it be replayed would
            // raise a question the design never answers — which of the two
            // times is yours — for a board you have already solved.
            disabled={done !== undefined}
            aria-label={label}
            onClick={() => onPick(s)}
          >
            {s.groups}×{s.wordsPerGroup}
            {done !== undefined && ` ✓ ${formatDuration(done)}`}
            {isCurrent && " pågår"}
          </button>
        );
      })}
    </div>
  );
}
