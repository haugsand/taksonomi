import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Category, TileData } from "@/lib/types";
import { shuffle, sleep } from "@/lib/util";
import { staggerDelays } from "@/lib/animation";
import { buildInitialTiles, combineTiles, countCompleted } from "@/lib/tiles";
import { assignRows, groupIntoRows } from "@/lib/layout";
import { clearGameState, loadGameState, saveGameState } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { usePersistentSize } from "@/hooks/usePersistentSize";
import { useGameSource } from "@/hooks/useGameSource";
import { useRowCount } from "@/hooks/useRowCount";
import { Header } from "./Header";
import { TileGrid } from "./TileGrid";
import { CompletionBanner } from "./CompletionBanner";
import { ProgressBar } from "./ProgressBar";
import "./Game.css";

/** Total time window (ms) over which all tiles stagger in on a new game. */
const ENTER_WINDOW_MS = 700;
/** Time window (ms) over which the previous game's tiles stagger out. */
const LEAVE_WINDOW_MS = 350;
/** Duration (ms) of a single tile's leave animation (matches the CSS). */
const LEAVE_ANIM_MS = 250;

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

  // Always-current tiles, so reset() can read them without being in its deps.
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

  const catByName = useMemo(
    () => new Map(activeCategories.map((c) => [c.name, c])),
    [activeCategories],
  );

  async function reset() {
    setLoading(true);
    setError(null);
    setEnterDelays(null);
    setSelectedId(null);

    // Start fetching right away — often instant from the prefetch cache — so the
    // request runs in parallel with the exit animation below.
    const dataPromise = getGame(groupCount, wordsPerGroup);

    // Animate the previous game's tiles out (staggered, random order) instead of
    // clearing the board abruptly.
    const leaving = tilesRef.current;
    if (leaving.length > 0) {
      const { delays, totalMs } = staggerDelays(
        leaving.map((t) => t.id),
        { windowMs: LEAVE_WINDOW_MS, maxStep: 16, tailMs: LEAVE_ANIM_MS },
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
        { windowMs: ENTER_WINDOW_MS, maxStep: 22, tailMs: 400 },
      );
      setActiveCategories(picked);
      setTiles(shuffled);
      setEnterDelays(delays);
      setExpandedIds(new Set());
      // Drop the entrance delays once the animation is done so later re-renders
      // don't replay it.
      setTimeout(() => setEnterDelays((cur) => (cur === delays ? null : cur)), totalMs);
      // Keep every size warm for the next "new game".
      setTimeout(prefetchAll, 800);
    } catch (e) {
      setLeavingDelays(null);
      setActiveCategories([]);
      setTiles([]);
      setError(e instanceof Error ? e.message : "Kunne ikke hente nytt spill");
    } finally {
      setLoading(false);
    }
  }

  // Restore a saved game of the current size, otherwise start a fresh one.
  useEffect(() => {
    const saved = loadGameState(size);
    if (saved) {
      setActiveCategories(saved.activeCategories);
      setTiles(saved.tiles);
      return;
    }
    reset();
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
      setTimeout(() => setShakeIds([]), 400);
    } else if (outcome.kind === "merged") {
      setTiles(outcome.tiles);
      setJustMergedId(outcome.mergedId);
      setTimeout(() => setJustMergedId(null), 600);
    }
  }

  function handleClick(id: string) {
    if (loading) return;
    const tile = tiles.find((t) => t.id === id);
    const cat = tile ? catByName.get(tile.categoryName) : null;
    const isComplete = !!tile && !!cat && tile.words.length === cat.words.length;
    if (isComplete) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    if (done) return;
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

  // Assign tiles to rows once we know how many rows fit and any are unplaced.
  useEffect(() => {
    if (rowCount <= 0 || tiles.length === 0) return;
    if (tiles.every((t) => typeof t.row === "number")) return;
    setTiles(assignRows(tiles, rowCount));
  }, [tiles, rowCount]);

  const rows = useMemo(() => groupIntoRows(tiles), [tiles]);

  return (
    <div className="game">
      <ProgressBar tileCount={tiles.length} groupCount={groupCount} wordsPerGroup={wordsPerGroup} />
      <Header
        groupCount={groupCount}
        wordsPerGroup={wordsPerGroup}
        theme={theme}
        onThemeChange={setTheme}
        onNewGame={(s) => {
          clearGameState();
          if (s.groups === groupCount && s.wordsPerGroup === wordsPerGroup) {
            reset();
          } else {
            setSize({ groups: s.groups, wordsPerGroup: s.wordsPerGroup });
          }
        }}
      />
      {done && (
        <CompletionBanner
          wordCount={groupCount * wordsPerGroup}
          categoryCount={activeCategories.length}
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
      <TileGrid
        rows={rows}
        boardRef={boardRef}
        catByName={catByName}
        selectedId={selectedId}
        shakeIds={shakeIds}
        justMergedId={justMergedId}
        expandedIds={expandedIds}
        enterDelays={enterDelays}
        leavingDelays={leavingDelays}
        done={done}
        loading={loading}
        onTileClick={handleClick}
        onCombine={combine}
      />
    </div>
  );
}
