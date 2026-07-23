import type { GameSize } from "@/lib/sizes";
import { Modal } from "./Modal";
import { SizePicker } from "./SizePicker";
import { TileField } from "./TileField";
import "./PosterModal.css";

type Props = {
  onShowAll: () => void;
  onNewGame: (size: GameSize) => void;
};

/** Shown when the last category is solved: celebrates the win, then offers to
 *  review the finished board or start a new game. Same poster style as the
 *  start screen. Dismissable — closing reveals the completed board. */
export function CompletionModal({ onShowAll, onNewGame }: Props) {
  return (
    <Modal ariaLabel="Spill fullført" onClose={onShowAll} bleed>
      <div className="poster-modal">
        <div className="poster-modal__poster">
          <TileField />
        </div>
        <div className="poster-modal__body">
          <h2 className="poster-modal__title">Fullført!</h2>
          <p className="poster-modal__intro">Gratulerer — du løste alle kategoriene.</p>
          <button type="button" className="poster-modal__action" onClick={onShowAll}>
            Se alle fullførte kategorier
          </button>
          <div className="poster-modal__section">
            <span className="poster-modal__label">Start nytt spill</span>
            <SizePicker onPick={onNewGame} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
