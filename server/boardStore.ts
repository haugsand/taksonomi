import type { Category } from "../src/lib/types";

/**
 * Where a decided daily board is kept.
 *
 * The point of storing it at all is that the board stops being a function of
 * `categories-data.ts` *as it is right now* and becomes a fact that was settled
 * once. Without this, deploying a category change at 14:00 gives everyone who
 * plays afterwards a different board from everyone who played before — same
 * seed, different input array, and Fisher–Yates over a changed list agrees with
 * the old order essentially nowhere.
 */
export type BoardStore = {
  get(key: string): Promise<Category[] | null>;
  put(key: string, board: Category[]): Promise<void>;
};

/**
 * The slice of Cloudflare's `KVNamespace` this needs.
 *
 * Written out structurally rather than imported: `server/` is not covered by
 * tsconfig's `include` and the Workers ambient types are not in scope here —
 * `Fetcher` in worker.ts does not resolve either. A structural type needs no
 * new dependency and still catches a wrong call shape wherever this file is
 * checked.
 */
export type KVLike = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

/** Cloudflare KV, with a lifetime so the store does not grow without bound. */
export function kvBoardStore(kv: KVLike, ttlSeconds: number): BoardStore {
  return {
    async get(key) {
      const value = await kv.get(key, "json");
      // A stored value that is not a board is ignored rather than served: the
      // board is rendered without further validation, and a half-written or
      // hand-edited entry would otherwise break the day for everyone.
      return isBoard(value) ? value : null;
    },
    async put(key, board) {
      await kv.put(key, JSON.stringify(board), { expirationTtl: ttlSeconds });
    },
  };
}

/**
 * In-memory, for `vite dev` and `vite preview`, which have no KV.
 *
 * It exists so dev runs the same code path as production rather than a
 * shortcut around it — the same reason the dev server calls the Worker's own
 * `newGame`. It freezes for the life of the dev process, which is exactly long
 * enough to notice if the freeze is wired up wrong.
 */
export function memoryBoardStore(): BoardStore {
  const boards = new Map<string, Category[]>();
  return {
    get: async (key) => boards.get(key) ?? null,
    put: async (key, board) => {
      boards.set(key, board);
    },
  };
}

function isBoard(value: unknown): value is Category[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Category).name === "string" &&
        Array.isArray((c as Category).words) &&
        (c as Category).words.every((w) => typeof w === "string"),
    )
  );
}
