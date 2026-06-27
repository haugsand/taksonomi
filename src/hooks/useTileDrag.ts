import { useState } from "preact/hooks";
import type { JSX } from "preact";

type DragEvent = JSX.TargetedDragEvent<HTMLButtonElement>;

/** Per-tile drag props, ready to spread onto a <Tile>. */
export type TileDragProps = {
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
};

/**
 * Owns the drag-and-drop interaction for the tile board: tracks which tile is
 * being dragged and which is hovered, and calls `onCombine` when one is dropped
 * onto another. Returns a factory for a single tile's drag props.
 */
export function useTileDrag(onCombine: (srcId: string, targetId: string) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function getTileDragProps(id: string): TileDragProps {
    return {
      isDragging: draggingId === id,
      isDragOver: dragOverId === id && draggingId !== null && draggingId !== id,
      onDragStart: (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", id);
          e.dataTransfer.effectAllowed = "move";
        }
        setDraggingId(id);
      },
      onDragEnd: () => {
        setDraggingId(null);
        setDragOverId(null);
      },
      onDragOver: (e) => {
        if (draggingId && draggingId !== id) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          if (dragOverId !== id) setDragOverId(id);
        }
      },
      onDragLeave: () => {
        if (dragOverId === id) setDragOverId(null);
      },
      onDrop: (e) => {
        e.preventDefault();
        const srcId = e.dataTransfer?.getData("text/plain") || draggingId;
        setDragOverId(null);
        setDraggingId(null);
        if (srcId && srcId !== id) onCombine(srcId, id);
      },
    };
  }

  return { getTileDragProps };
}
