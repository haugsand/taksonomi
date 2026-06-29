import type { RefObject } from "preact";
import type { Category } from "@/lib/types";
import { Board } from "./Board";
import "./CompletedBoard.css";

type Props = {
  categories: Category[];
  boardRef: RefObject<HTMLDivElement>;
};

export function CompletedBoard({ categories, boardRef }: Props) {
  return (
    <Board boardRef={boardRef}>
      {categories.map((cat) => (
        <div key={cat.name} className="board__row">
          <span className="completed-category__name">{cat.name}</span>
          {cat.words.map((word) => (
            <span key={word} className="completed-word">
              {word}
            </span>
          ))}
        </div>
      ))}
    </Board>
  );
}
