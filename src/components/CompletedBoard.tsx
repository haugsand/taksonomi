import { useState } from "preact/hooks";
import type { RefObject } from "preact";
import type { Category } from "@/lib/types";
import { chunkIntoRows } from "@/lib/layout";
import { Board } from "./Board";
import { Modal } from "./Modal";
import "./CompletedBoard.css";

type Props = {
  categories: Category[];
  /** How many rows fit in the board height; categories are spread across them. */
  rowCount: number;
  boardRef: RefObject<HTMLDivElement>;
};

/**
 * The finished-game board. Shows every category as a name-only chip (no words),
 * laid out across as many rows as fit the height so nothing spills below the
 * viewport. Clicking a chip opens a modal with the category's words. It does
 * NOT reuse Tile — the interaction (open a modal) is entirely different.
 */
export function CompletedBoard({ categories, rowCount, boardRef }: Props) {
  const [selected, setSelected] = useState<Category | null>(null);
  const rows = chunkIntoRows(categories, rowCount);

  return (
    <>
      <Board boardRef={boardRef}>
        {rows.map((row, i) => (
          <div key={i} className="board__row">
            {row.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className="completed-category"
                onClick={() => setSelected(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        ))}
      </Board>
      {selected && (
        <Modal ariaLabel={selected.name} onClose={() => setSelected(null)}>
          <h2 className="completed-category-modal__name">{selected.name}</h2>
          <ul className="completed-category-modal__words">
            {selected.words.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
