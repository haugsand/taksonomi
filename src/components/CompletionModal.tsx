import { useEffect, useRef } from "preact/hooks";
import { GAME_SIZES, type GameSize } from "@/lib/sizes";
import "./CompletionModal.css";

type Props = {
  onShowAll: () => void;
  onNewGame: (size: GameSize) => void;
};

export function CompletionModal({ onShowAll, onNewGame }: Props) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onShowAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onShowAll]);

  return (
    <div className="completion-modal__backdrop" onClick={onShowAll}>
      <div
        className="completion-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Spill fullført"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="completion-modal__message">Gratulerer — du løste alle kategoriene!</p>
        <button
          type="button"
          ref={firstButtonRef}
          className="completion-modal__button"
          onClick={onShowAll}
        >
          Se alle fullførte kategorier
        </button>
        <div className="completion-modal__new-game">
          <h2 className="completion-modal__new-game-heading">Start nytt spill</h2>
          <div className="completion-modal__sizes">
            {GAME_SIZES.map((s) => (
              <button
                key={s.label}
                type="button"
                className="completion-modal__size-button"
                onClick={() => onNewGame(s)}
              >
                {s.groups} × {s.wordsPerGroup}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
