import type { JSX } from "preact";
import "./Tile.css";

type CSSProperties = JSX.CSSProperties;
type DragEvent<T extends EventTarget> = JSX.TargetedDragEvent<T>;

export type TileData = {
  id: string;
  words: string[];
  categoryName: string;
  hue?: number;
  row?: number;
};

type Props = {
  tile: TileData;
  categoryName: string;
  categorySize: number;
  isSelected: boolean;
  isShaking: boolean;
  isMerged: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isExpanded: boolean;
  disabled: boolean;
  /** When set, the tile animates in with this delay (ms) — used on new game. */
  enterDelay?: number;
  /** When set, the tile animates out with this delay (ms) — used on new game. */
  leaveDelay?: number;
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLButtonElement>) => void;
};

export function Tile(props: Props) {
  const {
    tile,
    categoryName,
    categorySize,
    isSelected,
    isShaking,
    isMerged,
    isDragging,
    isDragOver,
    isExpanded,
    disabled,
    enterDelay,
    leaveDelay,
  } = props;

  const isGroup = tile.words.length > 1;
  const isComplete = tile.words.length === categorySize;

  const classes = ["tile"];
  if (isGroup) classes.push("tile--group");
  if (isComplete) classes.push("tile--complete");
  if (isSelected) classes.push("tile--selected");
  if (isDragOver) classes.push("tile--drag-over");
  if (isMerged) classes.push("tile--merged");
  if (isDragging) classes.push("tile--dragging");
  if (isShaking) classes.push("tile--shake");
  if (leaveDelay !== undefined) classes.push("tile--leave");
  else if (enterDelay !== undefined) classes.push("tile--enter");

  const style: CSSProperties = {};
  if (!isComplete && tile.hue !== undefined) {
    (style as Record<string, unknown>)["--group-hue"] = tile.hue;
  }
  const animDelay = leaveDelay ?? enterDelay;
  if (animDelay !== undefined) style.animationDelay = `${animDelay}ms`;

  const showWords = !isComplete || isExpanded;

  return (
    <button
      type="button"
      className={classes.join(" ")}
      style={style}
      draggable={!disabled && !isComplete}
      onClick={props.onClick}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      {isComplete && <span className="tile__name">{categoryName}</span>}
      {showWords && (
        <span className="tile__words">
          {isComplete && <span className="tile__sep"> · </span>}
          {tile.words.join(" · ")}
        </span>
      )}
      {isGroup && !isComplete && (
        <span className="tile__progress">
          {tile.words.length}/{categorySize}
        </span>
      )}
    </button>
  );
}
