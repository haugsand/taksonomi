import type { GameSize } from "@/lib/sizes";
import { Modal } from "./Modal";
import { SizePicker } from "./SizePicker";
import "./StartModal.css";

type Props = {
  onStart: (size: GameSize) => void;
};

/** Shown when there is no active game: explains the rules and lets the player
 *  pick a size to start. Non-dismissable — a size must be chosen. */
export function StartModal({ onStart }: Props) {
  return (
    <Modal ariaLabel="Velkommen til Taksonomi">
      <h2 className="start-modal__title">Taksonomi</h2>
      <div className="start-modal__rules">
        <p>Slå sammen ord som hører til samme kategori.</p>
        <ul>
          <li>Velg to ord, eller dra det ene oppå det andre.</li>
          <li>Hører de sammen, smelter de til én gruppe — ellers rister de.</li>
          <li>Fullfør alle kategoriene for å vinne.</li>
        </ul>
      </div>
      <div className="start-modal__choose">
        <h3 className="start-modal__choose-heading">Velg størrelse</h3>
        <SizePicker onPick={onStart} />
      </div>
    </Modal>
  );
}
