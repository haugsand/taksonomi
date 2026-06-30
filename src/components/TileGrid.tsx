import type { RefObject } from "preact";
import type { Category, TileData } from "@/lib/types";
import { useTileDrag } from "@/hooks/useTileDrag";
import { Board } from "./Board";
import { Tile, type Rect } from "./Tile";

type Props = {
  rows: TileData[][];
  /** The tile currently detached (pinned absolute) once it's been measured —
   *  rendered outside any .board__row so that row can collapse instead of
   *  claiming an empty gap slot. */
  completingTile: TileData | null;
  catByName: Map<string, Category>;
  boardRef: RefObject<HTMLDivElement>;
  selectedId: string | null;
  shakeIds: string[];
  justMergedId: string | null;
  fadingOutId: string | null;
  completingId: string | null;
  completingRect: Rect | null;
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
    completingTile,
    catByName,
    boardRef,
    selectedId,
    shakeIds,
    justMergedId,
    fadingOutId,
    completingId,
    completingRect,
    expandedIds,
    enterDelays,
    leavingDelays,
    done,
    loading,
    onTileClick,
    onCombine,
  } = props;

  const { getTileDragProps } = useTileDrag(onCombine);

  const renderTile = (t: TileData) => {
    const cat = catByName.get(t.categoryName);
    if (!cat) return null;
    return (
      <Tile
        key={t.id}
        tile={t}
        enterDelay={enterDelays?.get(t.id)}
        leaveDelay={leavingDelays?.get(t.id)}
        isFadingOut={fadingOutId === t.id}
        completingRect={completingId === t.id ? completingRect : null}
        categoryName={cat.name}
        categorySize={cat.words.length}
        isSelected={selectedId === t.id}
        isShaking={shakeIds.includes(t.id)}
        isMerged={justMergedId === t.id}
        isExpanded={expandedIds.has(t.id)}
        disabled={done || loading}
        onClick={() => onTileClick(t.id)}
        {...getTileDragProps(t.id)}
      />
    );
  };

  return (
    <Board boardRef={boardRef}>
      {rows.map((row, i) => (
        <div key={i} className="board__row">
          {row.map(renderTile)}
        </div>
      ))}
      {completingTile && renderTile(completingTile)}
    </Board>
  );
}
