import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Category, TileData } from "@/lib/types";
import { shuffle, sleep } from "@/lib/util";
import { staggerDelays } from "@/lib/animation";
import { buildInitialTiles, combineTiles, countCompleted, isTileComplete } from "@/lib/tiles";
import { assignRows, groupIntoRows } from "@/lib/layout";
import { clearGameState, loadGameState, saveGameState } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { usePersistentSize } from "@/hooks/usePersistentSize";
import { useGameSource } from "@/hooks/useGameSource";
import { useRowCount } from "@/hooks/useRowCount";
import { useTileCompletion } from "@/hooks/useTileCompletion";
import {
  ENTER_WINDOW_MS,
  ENTER_MAX_STEP_MS,
  ENTER_ANIM_MS,
  LEAVE_WINDOW_MS,
  LEAVE_MAX_STEP_MS,
  LEAVE_ANIM_MS,
  SHAKE_ANIM_MS,
  PREFETCH_REFILL_MS,
  animationVars,
} from "@/lib/constants";
import type { GameSize } from "@/lib/sizes";
import { Header } from "./Header";
import { TileGrid } from "./TileGrid";
import { CompletedBoard } from "./CompletedBoard";
import { CompletionModal } from "./CompletionModal";
import { StartModal } from "./StartModal";
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [enterDelays, setEnterDelays] = useState<Map<string, number> | null>(null);
  const [leavingDelays, setLeavingDelays] = useState<Map<string, number> | null>(null);
  const [endBoardVisible, setEndBoardVisible] = useState(false);
  const [finalModal, setFinalModal] = useState(false);
  const [showStart, setShowStart] = useState(false);
  // Height of the fixed header, reserved as padding-top on .game so the board
  // still starts below it. Tracked live so wrapping / orientation changes keep
  // the offset (and thus the row-count measurement) correct.
  const [headerHeight, setHeaderHeight] = useState(0);

  // Always-current tiles, so reset() can read them without being in its deps.
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

  const gameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Owns the post-merge pop / fade-out animation lifecycle.
  const completion = useTileCompletion({
    onHide: (id) => setTiles((ts) => ts.map((t) => (t.id === id ? { ...t, hidden: true } : t))),
    onFinal: () => setFinalModal(true),
  });

  // Keep headerHeight in sync with the fixed header's rendered height.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    completion.reset();
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
      const mergedId = outcome.mergedId;
      const merged = outcome.tiles.find((t) => t.id === mergedId);
      if (merged && isTileComplete(merged, catByName)) {
        const isFinal = countCompleted(outcome.tiles, catByName) === activeCategories.length;
        completion.completeCategory(mergedId, isFinal);
      } else {
        completion.popMerged(mergedId);
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

  // Row count is recomputed only when a new game starts (activeCategories
  // changes) and on orientation change — not on ordinary viewport resizes.
  // headerHeight is included so the first measurement corrects once the fixed
  // header's height settles; it stays constant across viewport resizes.
  const { boardRef, rowCount } = useRowCount([activeCategories, headerHeight]);

  // Assign tiles to rows once we know how many rows fit, and re-assign
  // whenever that count changes (a new game, or an orientation change where the
  // old layout may no longer fit). Gameplay changes alone (merging,
  // completing) must NOT reflow tiles — see tiles-never-move-rows — so this
  // only re-runs assignRows when rowCount itself moved since the last time we
  // used it, not on every tiles update.
  const assignedRowCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (rowCount <= 0 || tiles.length === 0) return;
    const needsInitialAssign = tiles.some((t) => typeof t.row !== "number");
    const rowCountChanged = assignedRowCountRef.current !== rowCount;
    if (!needsInitialAssign && !rowCountChanged) return;
    assignedRowCountRef.current = rowCount;
    setTiles(assignRows(tiles, rowCount));
  }, [tiles, rowCount]);

  // Completed categories fade out (and grow) in place, keeping their flex slot
  // until the fade finishes and the tile hides. They're only dropped from the
  // board once hidden.
  const visibleTiles = useMemo(() => tiles.filter((t) => !t.hidden), [tiles]);
  const rows = useMemo(() => groupIntoRows(visibleTiles), [visibleTiles]);

  return (
    <div
      className="game"
      ref={gameRef}
      style={{ ...animationVars, "--header-height": `${headerHeight}px` } as JSX.CSSProperties}
    >
      <Header
        headerRef={headerRef}
        groupCount={groupCount}
        wordsPerGroup={wordsPerGroup}
        completedCount={completedCount}
        tileCount={tiles.length}
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
        <CompletedBoard categories={activeCategories} rowCount={rowCount} boardRef={boardRef} />
      ) : (
        <TileGrid
          rows={rows}
          boardRef={boardRef}
          catByName={catByName}
          selectedId={selectedId}
          shakeIds={shakeIds}
          justMergedIds={completion.justMergedIds}
          fadingOutIds={completion.fadingOutIds}
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
