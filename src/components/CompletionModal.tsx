import type { GameSize } from "@/lib/sizes";
import { Modal } from "./Modal";
import { SizePicker } from "./SizePicker";
import "./CompletionModal.css";

type Props = {
  onShowAll: () => void;
  onNewGame: (size: GameSize) => void;
};

export function CompletionModal({ onShowAll, onNewGame }: Props) {
  return (
    <Modal ariaLabel="Spill fullført" onClose={onShowAll}>
      <p className="completion-modal__message">Gratulerer — du løste alle kategoriene!</p>
      <button type="button" className="completion-modal__button" onClick={onShowAll}>
        Se alle fullførte kategorier
      </button>
      <div className="completion-modal__new-game">
        <h2 className="completion-modal__new-game-heading">Start nytt spill</h2>
        <SizePicker onPick={onNewGame} />
      </div>
    </Modal>
  );
}
