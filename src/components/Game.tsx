import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Category, TileData } from "@/lib/types";
import type { Rect } from "./Tile";
import { shuffle, sleep } from "@/lib/util";
import { staggerDelays } from "@/lib/animation";
import { buildInitialTiles, combineTiles, countCompleted, isTileComplete } from "@/lib/tiles";
import { assignRows, groupIntoRows } from "@/lib/layout";
import { clearGameState, loadGameState, saveGameState } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { usePersistentSize } from "@/hooks/usePersistentSize";
import { useGameSource } from "@/hooks/useGameSource";
import { useRowCount } from "@/hooks/useRowCount";
import {
  ENTER_WINDOW_MS,
  ENTER_MAX_STEP_MS,
  ENTER_ANIM_MS,
  LEAVE_WINDOW_MS,
  LEAVE_MAX_STEP_MS,
  LEAVE_ANIM_MS,
  POP_ANIM_MS,
  SHAKE_ANIM_MS,
  PREFETCH_REFILL_MS,
  TILE_FADEOUT_MS,
  animationVars,
} from "@/lib/constants";
import type { GameSize } from "@/lib/sizes";
import { Header } from "./Header";
import { TileGrid } from "./TileGrid";
import { CompletedBoard } from "./CompletedBoard";
import { CompletionModal } from "./CompletionModal";
import { StartModal } from "./StartModal";
import { ProgressBar } from "./ProgressBar";
import "./Game.css";

export function Game() {
  const [size, setSize] = usePersistentSize();
  const { groups: groupCount, wordsPerGroup } = size;
  const [theme, setTheme] = useTheme();
  const { getGame, prefetchAll } = useGameSource();

  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shakeIds, setShakeIds] = useState<string[]>([]);
  const [justMergedId, setJustMergedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [enterDelays, setEnterDelays] = useState<Map<string, number> | null>(null);
  const [leavingDelays, setLeavingDelays] = useState<Map<string, number> | null>(null);
  const [endBoardVisible, setEndBoardVisible] = useState(false);
  const [finalModal, setFinalModal] = useState(false);
  const [fadingOutId, setFadingOutId] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  // The tile currently detached from the flex flow after its category
  // completed (pop -> pinned in place -> scales up while it fades out).
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completingRect, setCompletingRect] = useState<Rect | null>(null);

  // Always-current tiles, so reset() can read them without being in its deps.
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

  const gameRef = useRef<HTMLDivElement>(null);

  // Measures the completing tile's current (still in-flow) box relative to
  // .game, then pins it there via position: absolute — same spot, so the
  // switch out of the flex flow is invisible. Runs before paint.
  useLayoutEffect(() => {
    if (!completingId) return;
    const gameEl = gameRef.current;
    const tileEl = gameEl
      ? Array.from(gameEl.querySelectorAll<HTMLElement>("[data-tile-id]")).find(
          (el) => el.dataset.tileId === completingId,
        )
      : undefined;
    if (!gameEl || !tileEl) return;
    const gameBox = gameEl.getBoundingClientRect();
    const tileBox = tileEl.getBoundingClientRect();
    setCompletingRect({
      top: tileBox.top - gameBox.top,
      left: tileBox.left - gameBox.left,
      width: tileBox.width,
      height: tileBox.height,
    });
  }, [completingId]);

  // True once the player has started or restored a game. While false, an absent
  // game shows the start menu instead of auto-starting one.
  const startedRef = useRef(false);

  const catByName = useMemo(
    () => new Map(activeCategories.map((c) => [c.name, c])),
    [activeCategories],
  );

  async function reset() {
    setLoading(true);
    setError(null);
    setEnterDelays(null);
    setSelectedId(null);
    setFinalModal(false);
    setFadingOutId(null);
    setCompletingId(null);
    setCompletingRect(null);
    setEndBoardVisible(false);

    // Start fetching right away — often instant from the prefetch cache — so the
    // request runs in parallel with the exit animation below.
    const dataPromise = getGame(groupCount, wordsPerGroup);

    // Animate the previous game's tiles out (staggered, random order) instead of
    // clearing the board abruptly.
    const leaving = tilesRef.current;
    if (leaving.length > 0) {
      const { delays, totalMs } = staggerDelays(
        leaving.map((t) => t.id),
        { windowMs: LEAVE_WINDOW_MS, maxStep: LEAVE_MAX_STEP_MS, tailMs: LEAVE_ANIM_MS },
      );
      setLeavingDelays(delays);
      await sleep(totalMs);
      setActiveCategories([]);
      setTiles([]);
    }

    try {
      const picked = await dataPromise;
      // Clear leave markers before the new tiles render so a repeated word id
      // can't inherit the exit animation.
      setLeavingDelays(null);
      const shuffled = shuffle(buildInitialTiles(picked));
      // Stagger each tile's entrance in a random order, capped so big boards
      // still finish quickly (one and one word pops in).
      const { delays, totalMs } = staggerDelays(
        shuffled.map((t) => t.id),
        { windowMs: ENTER_WINDOW_MS, maxStep: ENTER_MAX_STEP_MS, tailMs: ENTER_ANIM_MS },
      );
      setActiveCategories(picked);
      setTiles(shuffled);
      setEnterDelays(delays);
      setExpandedIds(new Set());
      // Drop the entrance delays once the animation is done so later re-renders
      // don't replay it.
      setTimeout(() => setEnterDelays((cur) => (cur === delays ? null : cur)), totalMs);
      // Keep every size warm for the next "new game".
      setTimeout(prefetchAll, PREFETCH_REFILL_MS);
    } catch (e) {
      setLeavingDelays(null);
      setActiveCategories([]);
      setTiles([]);
      setError(e instanceof Error ? e.message : "Kunne ikke hente nytt spill");
    } finally {
      setLoading(false);
    }
  }

  // Starts a game at the given size (used by the start menu, the header and the
  // completion modal). Switching size lets the size effect below start it.
  function startGame(s: GameSize) {
    clearGameState();
    startedRef.current = true;
    setShowStart(false);
    if (s.groups === groupCount && s.wordsPerGroup === wordsPerGroup) {
      reset();
    } else {
      setSize({ groups: s.groups, wordsPerGroup: s.wordsPerGroup });
    }
  }

  // On load, restore a saved game of the current size; with none, show the start
  // menu rather than auto-starting. Once a game is under way, switching size
  // starts a fresh game directly.
  useEffect(() => {
    const saved = loadGameState(size);
    if (saved) {
      setActiveCategories(saved.activeCategories);
      setTiles(saved.tiles);
      startedRef.current = true;
      setShowStart(false);
      // A restored game that's already finished has no live completion
      // animation to play (and every tile is hidden) — show the completed
      // board right away instead of an empty one.
      const savedCatByName = new Map(saved.activeCategories.map((c) => [c.name, c]));
      const alreadyDone =
        saved.activeCategories.length > 0 &&
        countCompleted(saved.tiles, savedCatByName) === saved.activeCategories.length;
      if (alreadyDone) setEndBoardVisible(true);
      return;
    }
    if (startedRef.current) {
      reset();
    } else {
      setShowStart(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupCount, wordsPerGroup]);

  // Warm the cache with a game of every size shortly after mount, so the first
  // "new game" of any size is instant too.
  useEffect(() => {
    const id = setTimeout(prefetchAll, 600);
    return () => clearTimeout(id);
  }, [prefetchAll]);

  // Persist the current game.
  useEffect(() => {
    if (activeCategories.length === 0) return;
    saveGameState({ activeCategories, tiles, groups: groupCount, wordsPerGroup });
  }, [activeCategories, tiles, groupCount, wordsPerGroup]);

  const completedCount = useMemo(() => countCompleted(tiles, catByName), [tiles, catByName]);
  const done = activeCategories.length > 0 && completedCount === activeCategories.length;

  function combine(aId: string, bId: string) {
    if (done) return;
    const outcome = combineTiles(tiles, aId, bId, catByName);
    if (outcome.kind === "mismatch") {
      setShakeIds(outcome.ids);
      setTimeout(() => setShakeIds([]), SHAKE_ANIM_MS);
    } else if (outcome.kind === "merged") {
      setTiles(outcome.tiles);
      setJustMergedId(outcome.mergedId);
      const merged = outcome.tiles.find((t) => t.id === outcome.mergedId);
      if (merged && isTileComplete(merged, catByName)) {
        const isFinal = countCompleted(outcome.tiles, catByName) === activeCategories.length;
        const mergedId = merged.id;
        // Immediately pin the tile out of the flex flow at its current spot
        // (measured in the layout effect above), so growing it doesn't disturb
        // the rest of the board.
        setCompletingId(mergedId);
        // After the pop animation, fade it out in place while it scales up.
        setTimeout(() => {
          setJustMergedId(null);
          setFadingOutId(mergedId);
          setTimeout(() => {
            setFadingOutId(null);
            setCompletingId(null);
            setCompletingRect(null);
            setTiles((ts) => ts.map((t) => (t.id === mergedId ? { ...t, hidden: true } : t)));
            if (isFinal) setFinalModal(true);
          }, TILE_FADEOUT_MS);
        }, POP_ANIM_MS);
      } else {
        setTimeout(() => setJustMergedId(null), POP_ANIM_MS);
      }
    }
  }

  function handleClick(id: string) {
    if (loading || finalModal || done) return;
    const tile = tiles.find((t) => t.id === id);
    if (!tile || isTileComplete(tile, catByName)) return;
    if (selectedId === null) {
      setSelectedId(id);
    } else if (selectedId === id) {
      setSelectedId(null);
    } else {
      combine(selectedId, id);
      setSelectedId(null);
    }
  }

  const { boardRef, rowCount } = useRowCount([activeCategories, done]);

  // Assign tiles to rows once we know how many rows fit and any are unplaced,
  // spreading the words evenly across every row.
  useEffect(() => {
    if (rowCount <= 0 || tiles.length === 0) return;
    if (tiles.every((t) => typeof t.row === "number")) return;
    setTiles(assignRows(tiles, rowCount));
  }, [tiles, rowCount]);

  // Completed categories are hidden from the board until the game ends. Once
  // the completing tile has been measured and pinned (position: absolute), it
  // is also excluded here — left in, its now-empty row would still claim a
  // gap slot in .board__tiles' flex layout until the tile finished fading.
  // Until measured, it stays put so the layout effect above can read its true
  // in-flow position.
  const visibleTiles = useMemo(
    () => tiles.filter((t) => !t.hidden && (t.id !== completingId || !completingRect)),
    [tiles, completingId, completingRect],
  );
  const rows = useMemo(() => groupIntoRows(visibleTiles), [visibleTiles]);
  const completingTile = useMemo(
    () => (completingId && completingRect ? (tiles.find((t) => t.id === completingId) ?? null) : null),
    [tiles, completingId, completingRect],
  );

  return (
    <div className="game" ref={gameRef} style={animationVars as JSX.CSSProperties}>
      <ProgressBar tileCount={tiles.length} groupCount={groupCount} wordsPerGroup={wordsPerGroup} />
      <Header
        groupCount={groupCount}
        completedCount={completedCount}
        theme={theme}
        onThemeChange={setTheme}
        onNewGame={startGame}
      />
      {showStart && <StartModal onStart={startGame} />}
      {finalModal && (
        <CompletionModal
          onShowAll={() => {
            setFinalModal(false);
            setEndBoardVisible(true);
          }}
          onNewGame={(s) => {
            setFinalModal(false);
            startGame(s);
          }}
        />
      )}
      {error && (
        <div className="game__status game__status--error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => reset()}>
            Prøv igjen
          </button>
        </div>
      )}
      {endBoardVisible ? (
        <CompletedBoard categories={activeCategories} boardRef={boardRef} />
      ) : (
        <TileGrid
          rows={rows}
          boardRef={boardRef}
          catByName={catByName}
          selectedId={selectedId}
          shakeIds={shakeIds}
          justMergedId={justMergedId}
          fadingOutId={fadingOutId}
          completingId={completingId}
          completingRect={completingRect}
          completingTile={completingTile}
          expandedIds={expandedIds}
          enterDelays={enterDelays}
          leavingDelays={leavingDelays}
          done={done}
          loading={loading}
          onTileClick={handleClick}
          onCombine={combine}
        />
      )}
    </div>
  );
}
