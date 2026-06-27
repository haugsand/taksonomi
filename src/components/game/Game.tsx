import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Category } from "@/lib/types";
import { fetchNewGame } from "@/lib/api";
import { randomHue } from "@/lib/palette";

type DragEvent<T extends EventTarget> = JSX.TargetedDragEvent<T>;
import { Header, GAME_SIZES } from "./Header";
import { Board } from "./Board";
import { Tile, type TileData } from "./Tile";
import { CompletionBanner } from "./CompletionBanner";
import { ProgressBar } from "./ProgressBar";
import "./Game.css";

type Theme = "dark" | "light";
const THEME_KEY = "taksonomi:theme:v1";
const STORAGE_KEY = "taksonomi:state:v3";
const SIZE_KEY = "taksonomi:size:v1";
const DEFAULT_SIZE = { groups: 15, wordsPerGroup: 15 };
/** Total time window (ms) over which all tiles stagger in on a new game. */
const ENTER_WINDOW_MS = 700;
/** Time window (ms) over which the previous game's tiles stagger out. */
const LEAVE_WINDOW_MS = 350;
/** Duration (ms) of a single tile's leave animation (matches the CSS). */
const LEAVE_ANIM_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSize(): { groups: number; wordsPerGroup: number } {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p?.groups === "number" && typeof p?.wordsPerGroup === "number") {
        return { groups: p.groups, wordsPerGroup: p.wordsPerGroup };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SIZE;
}

export function Game() {
  const [size, setSize] = useState(loadSize);
  const { groups: groupCount, wordsPerGroup } = size;
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shakeIds, setShakeIds] = useState<string[]>([]);
  const [justMergedId, setJustMergedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [enterDelays, setEnterDelays] = useState<Map<string, number> | null>(null);
  const [leavingDelays, setLeavingDelays] = useState<Map<string, number> | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");

  // Always-current tiles, so reset() can read them without being in its deps.
  const tilesRef = useRef<TileData[]>([]);
  tilesRef.current = tiles;

  // Prefetch cache: size key -> ready game or in-flight request.
  const gameCache = useRef(new Map<string, Category[] | Promise<Category[]>>());

  const prefetch = useCallback((g: number, w: number) => {
    const key = `${g}:${w}`;
    if (gameCache.current.has(key)) return;
    const p = fetchNewGame(g, w);
    gameCache.current.set(key, p);
    p.then(
      (cats) => {
        if (gameCache.current.get(key) === p) gameCache.current.set(key, cats);
      },
      () => {
        if (gameCache.current.get(key) === p) gameCache.current.delete(key);
      },
    );
  }, []);

  // Returns a game for the size, instantly from cache when available, and tops
  // the cache back up for next time.
  const getGame = useCallback(
    (g: number, w: number): Promise<Category[]> => {
      const key = `${g}:${w}`;
      const entry = gameCache.current.get(key);
      gameCache.current.delete(key);
      const result = entry ? Promise.resolve(entry) : fetchNewGame(g, w);
      prefetch(g, w);
      return result;
    },
    [prefetch],
  );

  const prefetchAll = useCallback(() => {
    for (const s of GAME_SIZES) prefetch(s.groups, s.wordsPerGroup);
  }, [prefetch]);

  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(size));
    } catch {
      // ignore
    }
  }, [size]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const catByName = useMemo(
    () => new Map(activeCategories.map((c) => [c.name, c])),
    [activeCategories],
  );

  const reset = useCallback(async () => {
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
      const n = leaving.length;
      const step = Math.min(16, LEAVE_WINDOW_MS / n);
      const ranks = shuffle([...Array(n).keys()]);
      const out = new Map<string, number>();
      leaving.forEach((t, i) => out.set(t.id, ranks[i] * step));
      setLeavingDelays(out);
      await sleep((n - 1) * step + LEAVE_ANIM_MS);
      setActiveCategories([]);
      setTiles([]);
    }

    try {
      const picked = await dataPromise;
      // Clear leave markers before the new tiles render so a repeated word id
      // can't inherit the exit animation.
      setLeavingDelays(null);
      const initial: TileData[] = picked.flatMap((c) =>
        c.words.map((w) => ({ id: `${c.name}::${w}`, words: [w], categoryName: c.name })),
      );
      const shuffled = shuffle(initial);
      // Stagger each tile's entrance in a random order, capped so big boards
      // still finish quickly (one and one word pops in).
      const n = shuffled.length;
      const step = Math.min(22, ENTER_WINDOW_MS / Math.max(1, n));
      const ranks = shuffle([...Array(n).keys()]);
      const delays = new Map<string, number>();
      shuffled.forEach((t, i) => delays.set(t.id, ranks[i] * step));
      setActiveCategories(picked);
      setTiles(shuffled);
      setEnterDelays(delays);
      setExpandedIds(new Set());
      // Drop the entrance delays once the animation is done so later re-renders
      // don't replay it.
      const total = (n - 1) * step + 400;
      setTimeout(() => setEnterDelays((cur) => (cur === delays ? null : cur)), total);
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
  }, [groupCount, wordsPerGroup, getGame, prefetchAll]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          activeCategories: Category[];
          tiles: TileData[];
          groupCount?: number;
          wordsPerGroup?: number;
        };
        const cats = parsed.activeCategories;
        if (
          Array.isArray(cats) &&
          cats.length === groupCount &&
          cats.every((c) => c.words?.length === wordsPerGroup) &&
          Array.isArray(parsed.tiles)
        ) {
          setActiveCategories(cats);
          setTiles(parsed.tiles);
          return;
        }
      }
    } catch {
      // ignore
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

  useEffect(() => {
    if (activeCategories.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeCategories,
          tiles,
          groupCount,
          wordsPerGroup,
        }),
      );
    } catch {
      // ignore
    }
  }, [activeCategories, tiles, groupCount, wordsPerGroup]);

  const completedCount = useMemo(() => {
    let n = 0;
    for (const t of tiles) {
      const cat = catByName.get(t.categoryName);
      if (cat && t.words.length === cat.words.length) n++;
    }
    return n;
  }, [tiles, catByName]);

  const done = activeCategories.length > 0 && completedCount === activeCategories.length;

  function tryCombine(aId: string, bId: string) {
    if (done || aId === bId) return;
    const a = tiles.find((t) => t.id === aId);
    const b = tiles.find((t) => t.id === bId);
    if (!a || !b) return;
    if (a.categoryName !== b.categoryName) {
      setShakeIds([a.id, b.id]);
      setTimeout(() => setShakeIds([]), 400);
      return;
    }
    const cat = catByName.get(a.categoryName);
    if (!cat) return;
    const mergedSet = new Set([...a.words, ...b.words]);
    const ordered = cat.words.filter((w) => mergedSet.has(w));
    const newId = `group-${a.categoryName}-${ordered.length}-${Date.now()}`;
    const newTile: TileData = {
      id: newId,
      words: ordered,
      categoryName: a.categoryName,
      hue: b.hue ?? a.hue ?? randomHue(),
      row: b.row,
    };
    const idxA = tiles.findIndex((t) => t.id === a.id);
    const idxB = tiles.findIndex((t) => t.id === b.id);
    const next = tiles.filter((t) => t.id !== a.id && t.id !== b.id);
    next.splice(idxA < idxB ? idxB - 1 : idxB, 0, newTile);
    setTiles(next);
    setJustMergedId(newId);
    setTimeout(() => setJustMergedId(null), 600);
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
      tryCombine(selectedId, id);
      setSelectedId(null);
    }
  }

  const boardRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(10);

  const computeRowCount = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const styles = getComputedStyle(el);
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const rowGap = parseFloat(getComputedStyle(el.firstElementChild ?? el).rowGap || "6") || 6;

    // Measure an actual rendered row when possible; fall back to an estimate.
    const sampleRow = el.querySelector<HTMLElement>(".board__row");
    let rowHeight = sampleRow?.getBoundingClientRect().height ?? 0;
    if (!rowHeight) {
      const fontPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      rowHeight = Math.round(fontPx * 2.1); // tile padding + line-height ≈ 2.1rem
    }

    // Prefer the visual viewport on mobile (excludes browser chrome).
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const top = el.getBoundingClientRect().top;
    // Small safety margin to absorb sub-pixel rounding and avoid scrollbars.
    const SAFETY = 4;
    const available = viewportH - top - padY - SAFETY;
    const rows = Math.max(1, Math.floor((available + rowGap) / (rowHeight + rowGap)));
    setRowCount(rows);
  }, []);

  useLayoutEffect(() => {
    computeRowCount();
    window.addEventListener("resize", computeRowCount);
    window.visualViewport?.addEventListener("resize", computeRowCount);
    return () => {
      window.removeEventListener("resize", computeRowCount);
      window.visualViewport?.removeEventListener("resize", computeRowCount);
    };
  }, [computeRowCount]);

  useEffect(() => {
    // Recompute after tiles render so we can measure the actual row height.
    const id = requestAnimationFrame(() => computeRowCount());
    return () => cancelAnimationFrame(id);
  }, [activeCategories, done, computeRowCount]);

  useEffect(() => {
    if (rowCount <= 0 || tiles.length === 0) return;
    if (tiles.every((t) => typeof t.row === "number")) return;
    const n = tiles.length;
    const r = Math.max(1, Math.min(rowCount, n));
    const base = Math.floor(n / r);
    const rem = n % r;
    const next: TileData[] = new Array(n);
    let i = 0;
    for (let k = 0; k < r; k++) {
      const size = base + (k < rem ? 1 : 0);
      for (let j = 0; j < size; j++) {
        next[i] = { ...tiles[i], row: k };
        i++;
      }
    }
    setTiles(next);
  }, [tiles, rowCount]);

  const rows = useMemo(() => {
    const map = new Map<number, TileData[]>();
    for (const t of tiles) {
      const r = t.row ?? 0;
      const arr = map.get(r) ?? [];
      arr.push(t);
      map.set(r, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [tiles]);

  const renderTile = (t: TileData) => {
    const cat = catByName.get(t.categoryName);
    if (!cat) return null;
    return (
      <Tile
        key={t.id}
        tile={t}
        enterDelay={enterDelays?.get(t.id)}
        leaveDelay={leavingDelays?.get(t.id)}
        categoryName={cat.name}
        categorySize={cat.words.length}
        isSelected={selectedId === t.id}
        isShaking={shakeIds.includes(t.id)}
        isMerged={justMergedId === t.id}
        isDragging={draggingId === t.id}
        isDragOver={dragOverId === t.id && draggingId !== null && draggingId !== t.id}
        isExpanded={expandedIds.has(t.id)}
        disabled={done || loading}
        onClick={() => handleClick(t.id)}
        onDragStart={(e: DragEvent<HTMLButtonElement>) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData("text/plain", t.id);
            e.dataTransfer.effectAllowed = "move";
          }
          setDraggingId(t.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
        }}
        onDragOver={(e: DragEvent<HTMLButtonElement>) => {
          if (draggingId && draggingId !== t.id) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
            if (dragOverId !== t.id) setDragOverId(t.id);
          }
        }}
        onDragLeave={() => {
          if (dragOverId === t.id) setDragOverId(null);
        }}
        onDrop={(e: DragEvent<HTMLButtonElement>) => {
          e.preventDefault();
          const srcId = e.dataTransfer?.getData("text/plain") || draggingId;
          setDragOverId(null);
          setDraggingId(null);
          if (srcId && srcId !== t.id) tryCombine(srcId, t.id);
        }}
      />
    );
  };

  return (
    <div className="game">
      <ProgressBar tileCount={tiles.length} groupCount={groupCount} wordsPerGroup={wordsPerGroup} />
      <Header
        groupCount={groupCount}
        wordsPerGroup={wordsPerGroup}
        theme={theme}
        onThemeChange={setTheme}
        onNewGame={(s) => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
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
      {loading && tiles.length === 0 && <div className="game__status">Henter nytt spill …</div>}
      <Board boardRef={boardRef}>
        {rows.map((row, i) => (
          <div key={i} className="board__row">
            {row.map(renderTile)}
          </div>
        ))}
      </Board>
    </div>
  );
}
