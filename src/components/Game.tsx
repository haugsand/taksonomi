import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Category, TileData } from "@/lib/types";
import { shuffle, sleep } from "@/lib/util";
import { staggerDelays } from "@/lib/animation";
import { buildInitialTiles, combineTiles, countCompleted, isTileComplete } from "@/lib/tiles";
import { assignRows, groupIntoRows } from "@/lib/layout";
import { clearGame, loadGame, saveGame, type Mode, type Size } from "@/lib/storage";
import { loadDailyResults, saveDailyResult, type DailyResults } from "@/lib/dailyStorage";
import { dayKey, layoutRng } from "@/lib/daily";
import {
  elapsedMs,
  formatDuration,
  IDLE_TIMER,
  pauseTimer,
  startTimer,
  type Timer,
} from "@/lib/timer";
import { fetchDailyGame } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { useGameSource } from "@/hooks/useGameSource";
import { useRowCount } from "@/hooks/useRowCount";
import { useTileCompletion } from "@/hooks/useTileCompletion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAnnouncer } from "@/hooks/useAnnouncer";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { usePageVisible } from "@/hooks/usePageVisible";
import { prefetchDescriptions } from "@/hooks/useDescriptions";
import { MISMATCH, categoryCompleted, gameCompleted, merged } from "@/lib/announce";
import { PREFETCH_REFILL_MS, animationVars, timings } from "@/lib/constants";
import type { GameSize } from "@/lib/sizes";
import { Header } from "./Header";
import { LiveRegion } from "./LiveRegion";
import { TileGrid } from "./TileGrid";
import { CompletedView } from "./CompletedView";
import { StartModal, type RunningGame } from "./StartModal";
import "./Game.css";

const FALLBACK_SIZE: Size = { groups: 15, wordsPerGroup: 15 };

export function Game() {
  const [theme, setTheme] = useTheme();
  const { getGame, prefetchAll } = useGameSource();

  // One motion preference, one set of durations, shared by the JS timers below
  // and (via animationVars) the CSS. See constants.ts.
  const reducedMotion = useReducedMotion();
  const anim = useMemo(() => timings(reducedMotion), [reducedMotion]);

  // Everything the board conveys through animation and colour also has to be
  // said out loud; nothing in the core loop was reaching assistive tech.
  const [announcement, announce] = useAnnouncer();

  // Which kind of game is on the board. Only ever one at a time: starting
  // anything from the menu ends what was running, and the menu says so first.
  const [mode, setMode] = useState<Mode>("free");
  const [size, setSize] = useState<Size>(FALLBACK_SIZE);
  const { groups: groupCount, wordsPerGroup } = size;

  // The Oslo day the current daily board belongs to — not necessarily today,
  // if the tab has been open across midnight.
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [timer, setTimer] = useState<Timer>(IDLE_TIMER);
  const [today, setToday] = useState(dayKey);
  const [dailyResults, setDailyResults] = useState<DailyResults>(() => loadDailyResults(dayKey()));
  const [finalMs, setFinalMs] = useState<number | null>(null);

  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shakeIds, setShakeIds] = useState<string[]>([]);
  // The tile the last merge produced, so the keyboard cursor can follow it
  // rather than being left pointing at a tile that no longer exists.
  const [mergedTileId, setMergedTileId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [enterDelays, setEnterDelays] = useState<Map<string, number> | null>(null);
  const [leavingDelays, setLeavingDelays] = useState<Map<string, number> | null>(null);
  // The finished game arrives in two beats: the result takes over the empty
  // board, then the solved categories fill in under it. Two states rather than
  // one because they are a sequence — but unlike the flags they replace, they
  // only ever move forwards together and cannot contradict each other.
  const [resultShown, setResultShown] = useState(false);
  const [categoriesShown, setCategoriesShown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Height of the fixed header, reserved as padding-top on .game so the board
  // still starts below it. Tracked live so wrapping / orientation changes keep
  // the offset (and thus the row-count measurement) correct.
  const [headerHeight, setHeaderHeight] = useState(0);

  const visible = usePageVisible();

  // Always-current tiles, so load() can read them without being in its deps.
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

  const gameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Owns the post-merge pop / fade-out animation lifecycle.
  const completion = useTileCompletion({
    onHide: (id) => setTiles((ts) => ts.map((t) => (t.id === id ? { ...t, hidden: true } : t))),
    onFinal: () => setResultShown(true),
    timings: anim,
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

  const catByName = useMemo(
    () => new Map(activeCategories.map((c) => [c.name, c])),
    [activeCategories],
  );

  /** Fetches a board and animates the previous one out, then the new one in. */
  async function load(nextMode: Mode, s: GameSize) {
    setLoading(true);
    setError(null);
    setEnterDelays(null);
    setSelectedId(null);
    setMergedTileId(null);
    setResultShown(false);
    setCategoriesShown(false);
    announcedRef.current = false;
    completion.reset();

    // Start fetching right away — often instant from the prefetch cache — so the
    // request runs in parallel with the exit animation below.
    const dataPromise =
      nextMode === "daily"
        ? fetchDailyGame(s.groups, s.wordsPerGroup)
        : getGame(s.groups, s.wordsPerGroup).then((categories) => ({
            date: null as string | null,
            categories,
          }));

    // Animate the previous game's tiles out (staggered, random order) instead of
    // clearing the board abruptly.
    const leaving = tilesRef.current;
    if (leaving.length > 0) {
      const { delays, totalMs } = staggerDelays(
        leaving.map((t) => t.id),
        { windowMs: anim.leaveWindow, maxStep: anim.leaveMaxStep, tailMs: anim.leaveAnim },
      );
      setLeavingDelays(delays);
      await sleep(totalMs);
      setActiveCategories([]);
      setTiles([]);
    }

    try {
      const { date, categories } = await dataPromise;
      // Clear leave markers before the new tiles render so a repeated word id
      // can't inherit the exit animation.
      setLeavingDelays(null);
      // The daily board is only the same board for everyone if the opening
      // arrangement is too — the server can be perfectly deterministic and the
      // challenge still be unfair if every player starts from a different
      // shuffle of the same words. See lib/daily.ts.
      const shuffled = shuffle(
        buildInitialTiles(categories),
        date === null ? undefined : layoutRng(date, s.groups, s.wordsPerGroup),
      );
      // Stagger each tile's entrance in a random order, capped so big boards
      // still finish quickly (one and one word pops in).
      const { delays, totalMs } = staggerDelays(
        shuffled.map((t) => t.id),
        { windowMs: anim.enterWindow, maxStep: anim.enterMaxStep, tailMs: anim.enterAnim },
      );
      setDailyDate(date);
      setActiveCategories(categories);
      setTiles(shuffled);
      setEnterDelays(delays);
      setExpandedIds(new Set());
      // Drop the entrance delays once the animation is done so later re-renders
      // don't replay it.
      setTimeout(() => setEnterDelays((cur) => (cur === delays ? null : cur)), totalMs);
      // Keep every size warm for the next "new game". Daily boards are cached at
      // the edge and there is only one per size per day, so they are left alone —
      // prefetching them would also put every unplayed board of the day in the
      // network panel of anyone curious enough to look.
      if (nextMode === "free") setTimeout(prefetchAll, PREFETCH_REFILL_MS);
    } catch (e) {
      setLeavingDelays(null);
      setActiveCategories([]);
      setTiles([]);
      setError(e instanceof Error ? e.message : "Kunne ikke hente nytt spill");
    } finally {
      setLoading(false);
    }
  }

  /** Starts a game from the menu. Whatever was running is over. */
  function startGame(nextMode: Mode, s: GameSize) {
    clearGame();
    setMenuOpen(false);
    setMode(nextMode);
    setSize({ groups: s.groups, wordsPerGroup: s.wordsPerGroup });
    setDailyDate(null);
    setTimer(IDLE_TIMER);
    setFinalMs(null);
    recordedRef.current = null;
    void load(nextMode, s);
  }

  // On load, restore the saved game; with none, show the menu.
  useEffect(() => {
    const saved = loadGame();
    if (!saved) {
      setMenuOpen(true);
      return;
    }
    // Yesterday's challenge can't be finished today: everyone else has moved on
    // to a new board, so the time would compare against nothing.
    if (saved.mode === "daily" && saved.date !== today) {
      clearGame();
      setMenuOpen(true);
      return;
    }

    setMode(saved.mode);
    setSize({ groups: saved.groups, wordsPerGroup: saved.wordsPerGroup });
    setActiveCategories(saved.activeCategories);
    setTiles(saved.tiles);
    if (saved.mode === "daily") {
      setDailyDate(saved.date ?? null);
      setTimer(saved.timer ?? IDLE_TIMER);
    }

    // A restored game that's already finished has no live completion animation
    // to play (and every tile is hidden) — show the completed board right away
    // instead of an empty one.
    const savedCatByName = new Map(saved.activeCategories.map((c) => [c.name, c]));
    const alreadyDone =
      saved.activeCategories.length > 0 &&
      countCompleted(saved.tiles, savedCatByName) === saved.activeCategories.length;
    // A restored finished game has no animation left to play, so it skips
    // straight past both beats.
    if (alreadyDone) {
      setResultShown(true);
      setCategoriesShown(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the cache with a game of every size shortly after mount, so the first
  // "new game" of any size is instant too.
  useEffect(() => {
    const id = setTimeout(prefetchAll, 600);
    return () => clearTimeout(id);
  }, [prefetchAll]);

  // The day can turn over while the tab sits open; re-read it whenever the tab
  // comes back, so the menu offers today's challenge and not yesterday's.
  useEffect(() => {
    if (!visible) return;
    const current = dayKey();
    setToday(current);
    setDailyResults(loadDailyResults(current));
  }, [visible]);

  const completedCount = useMemo(() => countCompleted(tiles, catByName), [tiles, catByName]);
  const done = activeCategories.length > 0 && completedCount === activeCategories.length;

  // Pull each category's word descriptions the moment it is solved, rather than
  // when its chip is clicked on the finished board. Nothing is spoiled — the
  // player has just seen every word in it — and it turns a fetch the modal was
  // racing into one that finished minutes ago.
  //
  // Keyed on the count rather than fired from combine(), so a game restored
  // from storage primes the categories that were solved before this component
  // ever mounted. Tiles come from the ref: the set of *completed* ones only
  // ever changes when the count does, so re-running on every drag would be
  // wasted work. prefetchDescriptions is idempotent, so the repeated walk over
  // already-primed categories costs a map lookup each.
  useEffect(() => {
    if (completedCount === 0) return;
    for (const tile of tilesRef.current) {
      if (isTileComplete(tile, catByName)) {
        prefetchDescriptions(catByName.get(tile.categoryName)?.slug);
      }
    }
  }, [completedCount, catByName]);

  // The clock runs only while a daily board is actually playable. Opening the
  // menu pauses it: the sheet covers the board completely (the dialog backdrop
  // is opaque), so there is nothing to think about while it is up.
  const timerRunning =
    mode === "daily" && !done && !menuOpen && visible && !loading && tiles.length > 0;

  useEffect(() => {
    setTimer((t) => (timerRunning ? startTimer(t) : pauseTimer(t)));
  }, [timerRunning]);

  // Second beat: the solved categories fill in under the result, so the win
  // registers before the board repopulates. A restored finished game has both
  // beats already done and never reaches this.
  useEffect(() => {
    if (!resultShown || categoriesShown) return;
    const id = setTimeout(() => setCategoriesShown(true), anim.reveal);
    return () => clearTimeout(id);
  }, [resultShown, categoriesShown, anim.reveal]);

  // Say it out loud. The modal this replaces announced itself by taking focus;
  // with no modal, nothing would tell a screen reader the game was won — and
  // the time was never spoken at all, only "15 av 15 kategorier".
  const announcedRef = useRef(false);
  useEffect(() => {
    if (!resultShown || announcedRef.current) return;
    announcedRef.current = true;
    announce(
      gameCompleted(
        activeCategories.length,
        finalMs === null ? undefined : formatDuration(finalMs),
      ),
    );
  }, [resultShown, activeCategories.length, finalMs, announce]);

  // Record the finished time once, when the last category is solved — not when
  // the result appears, which is a fade-out later.
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!done || mode !== "daily" || dailyDate === null) return;
    const key = `${dailyDate}:${groupCount}x${wordsPerGroup}`;
    if (recordedRef.current === key) return;
    recordedRef.current = key;

    const ms = elapsedMs(pauseTimer(timer));
    setFinalMs(ms);
    // Only today's board counts towards today's list.
    if (dailyDate === today) {
      setDailyResults(saveDailyResult(dailyDate, groupCount, wordsPerGroup, ms));
    }
  }, [done, mode, dailyDate, groupCount, wordsPerGroup, timer, today]);

  // Persist the current game.
  useEffect(() => {
    if (activeCategories.length === 0) return;
    // A daily game without its date can't be validated on the way back in, so
    // it is not written at all rather than written to be discarded.
    if (mode === "daily" && dailyDate === null) return;
    saveGame({
      mode,
      groups: groupCount,
      wordsPerGroup,
      activeCategories,
      tiles,
      ...(mode === "daily" ? { date: dailyDate ?? undefined, timer } : {}),
    });
  }, [mode, activeCategories, tiles, groupCount, wordsPerGroup, dailyDate, timer]);

  function combine(aId: string, bId: string) {
    if (done) return;
    const outcome = combineTiles(tiles, aId, bId, catByName);
    if (outcome.kind === "mismatch") {
      setShakeIds(outcome.ids);
      setTimeout(() => setShakeIds([]), anim.shake);
      announce(MISMATCH);
    } else if (outcome.kind === "merged") {
      setTiles(outcome.tiles);
      const mergedId = outcome.mergedId;
      setMergedTileId(mergedId);
      const mergedTile = outcome.tiles.find((t) => t.id === mergedId);
      if (mergedTile && isTileComplete(mergedTile, catByName)) {
        const solved = countCompleted(outcome.tiles, catByName);
        const isFinal = solved === activeCategories.length;
        completion.completeCategory(mergedId, isFinal);
        // Announced at merge time, not when the fade ends: the player acted
        // now, and on the final category the modal that follows announces
        // itself when it takes focus.
        announce(categoryCompleted(mergedTile.categoryName, solved, activeCategories.length));
      } else {
        completion.popMerged(mergedId);
        if (mergedTile) {
          const categorySize = catByName.get(mergedTile.categoryName)?.words.length ?? 0;
          announce(merged(mergedTile.words.length, categorySize));
        }
      }
    }
  }

  function handleClick(id: string) {
    if (loading || resultShown || menuOpen || done) return;
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
  const { boardRef, rowCount } = useRowCount([activeCategories, headerHeight, categoriesShown]);

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

  const displayMs = useTimerDisplay(mode === "daily" ? timer : null);

  // A finished game is not something to resume, but it is still something to go
  // back to — so the sheet stays closable even when there is nothing to resume.
  const running: RunningGame | null =
    activeCategories.length > 0 && !done
      ? {
          mode,
          groups: groupCount,
          wordsPerGroup,
          completedCount,
          categoryCount: activeCategories.length,
          elapsedMs: mode === "daily" ? elapsedMs(timer) : undefined,
        }
      : null;

  return (
    <div
      className="game"
      ref={gameRef}
      style={
        { ...animationVars(anim), "--header-height": `${headerHeight}px` } as JSX.CSSProperties
      }
    >
      <Header
        headerRef={headerRef}
        groupCount={groupCount}
        wordsPerGroup={wordsPerGroup}
        completedCount={completedCount}
        tileCount={tiles.length}
        elapsedMs={mode === "daily" && dailyDate !== null ? displayMs : undefined}
        onOpenMenu={() => setMenuOpen(true)}
      />
      <LiveRegion announcement={announcement} />
      {menuOpen && (
        <StartModal
          today={today}
          dailyResults={dailyResults}
          running={running}
          dismissable={activeCategories.length > 0}
          theme={theme}
          onThemeChange={setTheme}
          onStart={startGame}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {error && (
        <div className="game__status game__status--error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setMenuOpen(true)}>
            Prøv igjen
          </button>
        </div>
      )}
      {resultShown ? (
        <CompletedView
          categories={activeCategories}
          rowCount={rowCount}
          boardRef={boardRef}
          groups={groupCount}
          wordsPerGroup={wordsPerGroup}
          categoriesShown={categoriesShown}
          elapsedMs={mode === "daily" ? (finalMs ?? undefined) : undefined}
          date={mode === "daily" ? (dailyDate ?? undefined) : undefined}
        />
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
          onClearSelection={() => setSelectedId(null)}
          mergedTileId={mergedTileId}
        />
      )}
    </div>
  );
}
