import type { ComponentChildren, Ref } from "preact";
import "./Board.css";

export function Board({
  children,
  boardRef,
}: {
  children: ComponentChildren;
  boardRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="board" ref={boardRef}>
      <div className="board__tiles">{children}</div>
    </div>
  );
}
