import type { JSX } from "preact";
import type { TileData } from "@/lib/types";
import "./Tile.css";

export type { TileData };

type CSSProperties = JSX.CSSProperties;
type DragEvent<T extends EventTarget> = JSX.TargetedDragEvent<T>;

/** A tile's box, measured relative to the .game root. */
export type Rect = { top: number; left: number; width: number; height: number };

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
  /** When true, the tile fades out slowly (category completion). */
  isFadingOut?: boolean;
  /** Set once this tile's category completes: pins it at this measured rect,
   *  out of the normal flex flow, instead of letting it sit in its row. */
  completingRect?: Rect | null;
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
    isFadingOut,
    completingRect,
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
  if (completingRect) classes.push("tile--completing");
  if (isFadingOut) classes.push("tile--fadeout");
  else if (leaveDelay !== undefined) classes.push("tile--leave");
  else if (enterDelay !== undefined) classes.push("tile--enter");

  const style: CSSProperties = {};
  if (!isComplete && tile.hue !== undefined) {
    (style as Record<string, unknown>)["--group-hue"] = tile.hue;
  }
  const animDelay = leaveDelay ?? enterDelay;
  if (animDelay !== undefined) style.animationDelay = `${animDelay}ms`;

  if (completingRect) {
    style.position = "absolute";
    style.top = `${completingRect.top}px`;
    style.left = `${completingRect.left}px`;
    style.width = `${completingRect.width}px`;
    style.height = `${completingRect.height}px`;
    style.margin = 0;
  }

  const showWords = !isComplete || isExpanded;

  return (
    <button
      type="button"
      className={classes.join(" ")}
      style={style}
      data-tile-id={tile.id}
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
