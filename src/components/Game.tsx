import { useEffect, useMemo, useRef, useState } from "preact/hooks";
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

  // Always-current tiles, so reset() can read them without being in its deps.
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

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
        // After the pop animation, start the fade immediately.
        setTimeout(() => {
          setJustMergedId(null);
          setFadingOutId(mergedId);
          setTimeout(() => {
            setFadingOutId(null);
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

  // Completed categories are hidden from the board until the game ends.
  const visibleTiles = useMemo(() => tiles.filter((t) => !t.hidden), [tiles]);
  const rows = useMemo(() => groupIntoRows(visibleTiles), [visibleTiles]);

  return (
    <div className="game" style={animationVars as JSX.CSSProperties}>
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
