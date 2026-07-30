import type { ComponentChildren, Ref } from "preact";
import "./Board.css";

export function Board({
  children,
  boardRef,
  ariaLabel,
}: {
  children: ComponentChildren;
  boardRef?: Ref<HTMLDivElement>;
  /** Names the board in the accessibility tree. Without it the tiles are a flat
   *  run of buttons with nothing marking where the game begins. */
  ariaLabel: string;
}) {
  return (
    <div className="board" ref={boardRef} role="group" aria-label={ariaLabel}>
      <div className="board__tiles">{children}</div>
    </div>
  );
}
