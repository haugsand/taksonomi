import { useState } from "preact/hooks";
import type { RefObject } from "preact";
import type { Category } from "@/lib/types";
import { chunkIntoRows } from "@/lib/layout";
import { useDescriptions } from "@/hooks/useDescriptions";
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
 * viewport. Clicking a chip opens a modal with the category's words, each with
 * a short description of what it is. It does NOT reuse Tile — the interaction
 * (open a modal) is entirely different.
 */
export function CompletedBoard({ categories, rowCount, boardRef }: Props) {
  const [selected, setSelected] = useState<Category | null>(null);
  const rows = chunkIntoRows(categories, rowCount);
  const { load, get } = useDescriptions();
  const descriptions = get(selected?.slug);

  return (
    <>
      <Board boardRef={boardRef} ariaLabel="Fullførte kategorier">
        {rows.map((row, i) => (
          <div key={i} className="board__row">
            {row.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className="completed-category"
                // A safety net, not the main path: Game primed every category
                // as it was solved. This retries the one case that leaves a
                // gap — a prefetch that failed, which is deliberately not
                // cached as a failure.
                onMouseEnter={() => load(cat.slug)}
                onFocus={() => load(cat.slug)}
                onClick={() => {
                  load(cat.slug);
                  setSelected(cat);
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        ))}
      </Board>
      {selected && (
        <Modal ariaLabel={selected.name} onClose={() => setSelected(null)}>
          <div className="completed-category-modal__header">
            <h2 className="completed-category-modal__name">{selected.name}</h2>
            <button
              type="button"
              className="completed-category-modal__close"
              aria-label="Lukk"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
          </div>
          {/* A description list rather than a bare list: the pairing of word and
              explanation *is* the content, and <dl> is what says so to a screen
              reader. A word with no description renders as a lone <dt>, which is
              valid and reads as "just this word" rather than as a gap. */}
          <dl className="completed-category-modal__words">
            {selected.words.map((word) => (
              <div key={word} className="completed-category-modal__word">
                <dt>{word}</dt>
                {descriptions?.[word] && <dd>{descriptions[word]}</dd>}
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </>
  );
}
