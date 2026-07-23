import type { GameSize } from "@/lib/sizes";
import { Modal } from "./Modal";
import { SizePicker } from "./SizePicker";
import { TileField } from "./TileField";
import "./PosterModal.css";

type Props = {
  onStart: (size: GameSize) => void;
};

/** Shown when there is no active game: explains the rules and lets the player
 *  pick a size to start. Non-dismissable — a size must be chosen. */
export function StartModal({ onStart }: Props) {
  return (
    <Modal ariaLabel="Velkommen til Taksonomi" bleed>
      <div className="poster-modal">
        <div className="poster-modal__poster">
          <TileField />
        </div>
        <div className="poster-modal__body">
          <h2 className="poster-modal__title">Taksonomi</h2>
          <p className="poster-modal__intro">Slå sammen ord som hører til samme kategori.</p>
          <ul className="poster-modal__rules">
            <li>Velg to ord, eller dra det ene oppå det andre.</li>
            <li>Hører de sammen, smelter de til én gruppe — ellers rister de.</li>
            <li>Fullfør alle kategoriene for å vinne.</li>
          </ul>
          <div className="poster-modal__section">
            <span className="poster-modal__label">Velg størrelse</span>
            <SizePicker onPick={onStart} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
