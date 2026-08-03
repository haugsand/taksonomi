import type { JSX } from "preact";
import type { TileData } from "@/lib/types";
import { completedTileLabel, tileLabel } from "@/lib/announce";
import "./Tile.css";

export type { TileData };

type CSSProperties = JSX.CSSProperties;
type DragEvent<T extends EventTarget> = JSX.TargetedDragEvent<T>;

type Props = {
  tile: TileData;
  categoryName: string;
  categorySize: number;
  isSelected: boolean;
  isShaking: boolean;
  isMerged: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  disabled: boolean;
  /** When set, the tile animates in with this delay (ms) — used on new game. */
  enterDelay?: number;
  /** When set, the tile animates out with this delay (ms) — used on new game. */
  leaveDelay?: number;
  /** When true, the tile fades out slowly (category completion). */
  isFadingOut?: boolean;
  /** Roving tabindex: only the board's current tile is in the tab order, so the
   *  whole board is one tab stop instead of up to 1600. */
  isTabbable?: boolean;
  /** Hands the element to the board so it can move focus and measure position
   *  without an identifying attribute in the DOM. */
  elementRef?: (el: HTMLButtonElement | null) => void;
  onFocus?: () => void;
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
    disabled,
    enterDelay,
    leaveDelay,
    isFadingOut,
    isTabbable = true,
    elementRef,
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
  if (isFadingOut) classes.push("tile--fadeout");
  else if (leaveDelay !== undefined) classes.push("tile--leave");
  else if (enterDelay !== undefined) classes.push("tile--enter");

  const style: CSSProperties = {};
  // Kept on a completed tile too, so it holds the category's colour while it
  // shrinks away rather than greying out a frame before it goes.
  if (tile.hue !== undefined) {
    (style as Record<string, unknown>)["--group-hue"] = tile.hue;
  }
  const animDelay = leaveDelay ?? enterDelay;
  if (animDelay !== undefined) style.animationDelay = `${animDelay}ms`;

  // The tile id embeds the category name ("Kjemiske grunnstoffer::hydrogen"),
  // so it must not reach the DOM: it was rendered as data-tile-id, read by
  // nothing, and handed every answer to anyone who opened the inspector. The
  // same reasoning governs the label below — see announce.ts.
  const label = isComplete
    ? completedTileLabel(categoryName, tile.words)
    : tileLabel(tile.words, categorySize, false);

  return (
    <button
      type="button"
      className={classes.join(" ")}
      style={style}
      ref={elementRef}
      tabIndex={isTabbable ? 0 : -1}
      aria-label={label ?? undefined}
      aria-pressed={isComplete ? undefined : isSelected}
      draggable={!disabled && !isComplete}
      onFocus={props.onFocus}
      onClick={props.onClick}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      {/* A completed tile keeps its words and shrinks away with them. It used
          to replace them with the category name and linger for three seconds;
          the name now lives only on the finished-game board (CompletedBoard)
          and in the label below. */}
      <span className="tile__words">{tile.words.join(" · ")}</span>
      {isGroup && !isComplete && (
        <span className="tile__progress">
          {tile.words.length}/{categorySize}
        </span>
      )}
    </button>
  );
}
