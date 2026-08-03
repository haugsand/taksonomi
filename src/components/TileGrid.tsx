import type { RefObject } from "preact";
import type { Category, TileData } from "@/lib/types";
import { useTileDrag } from "@/hooks/useTileDrag";
import { useBoardKeyboard } from "@/hooks/useBoardKeyboard";
import { useBoardReflow } from "@/hooks/useBoardReflow";
import { Board } from "./Board";
import { Tile } from "./Tile";

type Props = {
  rows: TileData[][];
  catByName: Map<string, Category>;
  boardRef: RefObject<HTMLDivElement>;
  selectedId: string | null;
  shakeIds: string[];
  justMergedIds: Set<string>;
  fadingOutIds: Set<string>;
  enterDelays: Map<string, number> | null;
  leavingDelays: Map<string, number> | null;
  done: boolean;
  loading: boolean;
  onTileClick: (id: string) => void;
  onCombine: (aId: string, bId: string) => void;
  /** Escape on the board backs out of a half-made selection. */
  onClearSelection: () => void;
  /** The tile a merge just produced; the keyboard cursor follows it there. */
  mergedTileId: string | null;
};

/** Renders the tile board and owns the drag-and-drop interaction state. */
export function TileGrid(props: Props) {
  const {
    rows,
    catByName,
    boardRef,
    selectedId,
    shakeIds,
    justMergedIds,
    fadingOutIds,
    enterDelays,
    leavingDelays,
    done,
    loading,
    onTileClick,
    onCombine,
    onClearSelection,
    mergedTileId,
  } = props;

  const { getTileDragProps } = useTileDrag(onCombine);
  const { tabbableId, registerTile, onKeyDown, onTileFocus } = useBoardKeyboard({
    rows,
    onEscape: onClearSelection,
    cursorTileId: mergedTileId,
  });
  const { measureTile, measureRow } = useBoardReflow(rows);

  const renderTile = (t: TileData) => {
    const cat = catByName.get(t.categoryName);
    if (!cat) return null;
    return (
      <Tile
        key={t.id}
        tile={t}
        isTabbable={t.id === tabbableId}
        elementRef={(el) => {
          registerTile(t.id, el);
          measureTile(t.id, el);
        }}
        onFocus={() => onTileFocus(t.id)}
        enterDelay={enterDelays?.get(t.id)}
        leaveDelay={leavingDelays?.get(t.id)}
        isFadingOut={fadingOutIds.has(t.id)}
        categoryName={cat.name}
        categorySize={cat.words.length}
        isSelected={selectedId === t.id}
        isShaking={shakeIds.includes(t.id)}
        isMerged={justMergedIds.has(t.id)}
        disabled={done || loading}
        onClick={() => onTileClick(t.id)}
        {...getTileDragProps(t.id)}
      />
    );
  };

  return (
    // The keydown listener sits on the board rather than each tile: it needs
    // the whole grid to work out where the arrow keys lead, and one listener
    // beats 1600.
    <div onKeyDown={onKeyDown} className="tile-grid">
      <Board boardRef={boardRef} ariaLabel="Spillebrett">
        {rows.map((row, i) => {
          // Keyed by the row's own index, not its place in the array. Once a
          // row empties, groupIntoRows stops returning it, and an array-index
          // key would hand its DOM node to the row below instead of unmounting
          // it — every row would keep its box and swap contents, so nothing
          // would ever move for useBoardReflow to animate.
          const key = row[0]?.row ?? i;
          return (
            <div key={key} className="board__row" ref={(el) => measureRow(key, el)}>
              {row.map(renderTile)}
            </div>
          );
        })}
      </Board>
    </div>
  );
}
