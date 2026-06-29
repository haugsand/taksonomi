import { GAME_SIZES, type GameSize } from "@/lib/sizes";
import "./SizePicker.css";

type Props = {
  onPick: (size: GameSize) => void;
};

/** Grid of buttons for picking a game size, labelled by its dimensions. */
export function SizePicker({ onPick }: Props) {
  return (
    <div className="size-picker">
      {GAME_SIZES.map((s) => (
        <button
          key={s.label}
          type="button"
          className="size-picker__button"
          onClick={() => onPick(s)}
        >
          {s.groups} × {s.wordsPerGroup}
        </button>
      ))}
    </div>
  );
}
