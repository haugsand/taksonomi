import { useState } from "preact/hooks";
import type { JSX, RefObject } from "preact";
import type { Category, TileData } from "@/lib/types";
import { Board } from "./Board";
import { Tile } from "./Tile";

type DragEvent<T extends EventTarget> = JSX.TargetedDragEvent<T>;

type Props = {
  rows: TileData[][];
  catByName: Map<string, Category>;
  boardRef: RefObject<HTMLDivElement>;
  selectedId: string | null;
  shakeIds: string[];
  justMergedId: string | null;
  expandedIds: Set<string>;
  enterDelays: Map<string, number> | null;
  leavingDelays: Map<string, number> | null;
  done: boolean;
  loading: boolean;
  onTileClick: (id: string) => void;
  onCombine: (aId: string, bId: string) => void;
};

/** Renders the tile board and owns the drag-and-drop interaction state. */
export function TileGrid(props: Props) {
  const {
    rows,
    catByName,
    boardRef,
    selectedId,
    shakeIds,
    justMergedId,
    expandedIds,
    enterDelays,
    leavingDelays,
    done,
    loading,
    onTileClick,
    onCombine,
  } = props;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const renderTile = (t: TileData) => {
    const cat = catByName.get(t.categoryName);
    if (!cat) return null;
    return (
      <Tile
        key={t.id}
        tile={t}
        enterDelay={enterDelays?.get(t.id)}
        leaveDelay={leavingDelays?.get(t.id)}
        categoryName={cat.name}
        categorySize={cat.words.length}
        isSelected={selectedId === t.id}
        isShaking={shakeIds.includes(t.id)}
        isMerged={justMergedId === t.id}
        isDragging={draggingId === t.id}
        isDragOver={dragOverId === t.id && draggingId !== null && draggingId !== t.id}
        isExpanded={expandedIds.has(t.id)}
        disabled={done || loading}
        onClick={() => onTileClick(t.id)}
        onDragStart={(e: DragEvent<HTMLButtonElement>) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData("text/plain", t.id);
            e.dataTransfer.effectAllowed = "move";
          }
          setDraggingId(t.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
        }}
        onDragOver={(e: DragEvent<HTMLButtonElement>) => {
          if (draggingId && draggingId !== t.id) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
            if (dragOverId !== t.id) setDragOverId(t.id);
          }
        }}
        onDragLeave={() => {
          if (dragOverId === t.id) setDragOverId(null);
        }}
        onDrop={(e: DragEvent<HTMLButtonElement>) => {
          e.preventDefault();
          const srcId = e.dataTransfer?.getData("text/plain") || draggingId;
          setDragOverId(null);
          setDraggingId(null);
          if (srcId && srcId !== t.id) onCombine(srcId, t.id);
        }}
      />
    );
  };

  return (
    <Board boardRef={boardRef}>
      {rows.map((row, i) => {
        const isCompletedRow =
          row.length > 0 &&
          row.every((t) => {
            const cat = catByName.get(t.categoryName);
            return !!cat && t.words.length === cat.words.length;
          });
        return (
          <div
            key={i}
            className={isCompletedRow ? "board__row board__row--completed" : "board__row"}
          >
            {row.map(renderTile)}
          </div>
        );
      })}
    </Board>
  );
}
