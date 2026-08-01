import { describe, expect, it, vi } from "vitest";
import { GAME_SIZES } from "../src/lib/sizes";
import { dailyKey, dailyGame, newGame } from "./newGame";
import { memoryBoardStore, type BoardStore } from "./boardStore";

function run(query: string) {
  return newGame(new URLSearchParams(query));
}

function runDaily(query: string, now?: Date, store?: BoardStore) {
  return dailyGame(new URLSearchParams(query), { now, store });
}

describe("newGame", () => {
  it("serves every size the UI offers", () => {
    for (const size of GAME_SIZES) {
      const result = run(`groups=${size.groups}&words=${size.wordsPerGroup}`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.categories).toHaveLength(size.groups);
      for (const cat of result.categories) expect(cat.words).toHaveLength(size.wordsPerGroup);
    }
  });

  it("rejects sizes outside the offered set", () => {
    // The last one used to return the entire data set (~80 KB) after clamping.
    for (const query of [
      "groups=20&words=25", // a valid-looking pair the UI never offers
      "groups=41&words=40",
      "groups=1e9&words=1e9",
    ]) {
      expect(run(query)).toEqual({ ok: false, status: 400, error: "unsupported game size" });
    }
  });

  it("rejects missing and non-numeric parameters", () => {
    // Number(null) is 0, which passes an isFinite check — the size lookup is
    // what actually catches an absent parameter.
    for (const query of ["", "groups=15", "words=15", "groups=abc&words=abc"]) {
      expect(run(query).ok).toBe(false);
    }
  });
});

describe("dailyGame", () => {
  const morning = new Date("2026-07-30T06:00:00Z");
  const evening = new Date("2026-07-30T19:00:00Z");

  it("gives everyone the same board, whenever they ask for it", async () => {
    // The whole feature rests on this line. Two calls thirteen hours apart, as
    // two players on opposite sides of the day, must get an identical board.
    const first = await runDaily("groups=15&words=15", morning);
    const second = await runDaily("groups=15&words=15", evening);
    expect(first).toEqual(second);
  });

  it("gives a different board the next day", async () => {
    const today = await runDaily("groups=15&words=15", morning);
    const tomorrow = await runDaily("groups=15&words=15", new Date("2026-07-31T06:00:00Z"));
    expect(today.ok && tomorrow.ok).toBe(true);
    if (!today.ok || !tomorrow.ok) return;
    expect(today.categories).not.toEqual(tomorrow.categories);
  });

  it("gives a different board at each size on the same day", async () => {
    const small = await runDaily("groups=15&words=15", morning);
    const large = await runDaily("groups=20&words=20", morning);
    expect(small.ok && large.ok).toBe(true);
    if (!small.ok || !large.ok) return;
    expect(small.categories[0]).not.toEqual(large.categories[0]);
  });

  it("reports the day the board belongs to, so the client seeds its layout the same way", async () => {
    const result = await runDaily("groups=15&words=15", new Date("2026-07-30T22:30:00Z"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 00:30 in Oslo — already the next day.
    expect(result.date).toBe("2026-07-31");
  });

  it("serves every size the UI offers", async () => {
    for (const size of GAME_SIZES) {
      const result = await runDaily(`groups=${size.groups}&words=${size.wordsPerGroup}`, morning);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.categories).toHaveLength(size.groups);
      for (const cat of result.categories) expect(cat.words).toHaveLength(size.wordsPerGroup);
    }
  });

  it("rejects sizes outside the offered set, like /api/new-game", async () => {
    expect(await runDaily("groups=20&words=25")).toEqual({
      ok: false,
      status: 400,
      error: "unsupported game size",
    });
  });

  it("takes no date from the caller", async () => {
    // A date parameter would let anyone fetch tomorrow's board and turn up in
    // the morning with the answers. It is ignored.
    const asked = await runDaily("groups=15&words=15&date=2030-01-01", morning);
    const plain = await runDaily("groups=15&words=15", morning);
    expect(asked).toEqual(plain);
  });
});

describe("dailyGame, frozen", () => {
  const morning = new Date("2026-07-30T06:00:00Z");
  const key = dailyKey("2026-07-30", 15, 15);

  it("writes the board it decided, under the day and size", async () => {
    const store = memoryBoardStore();
    const result = await runDaily("groups=15&words=15", morning, store);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await store.get(key)).toEqual(result.categories);
  });

  it("serves what is stored instead of drawing again", async () => {
    // This is the whole point. The stored board is deliberately nothing the
    // seed would ever produce: if the response contains it, the draw was not
    // consulted — which is exactly what protects a day from a mid-day deploy
    // of categories-data.ts.
    const store = memoryBoardStore();
    const settled = [{ name: "Avgjort", words: ["a", "b", "c"] }];
    await store.put(key, settled);

    const result = await runDaily("groups=15&words=15", morning, store);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.categories).toEqual(settled);
  });

  it("keeps each day and size on its own key", async () => {
    const store = memoryBoardStore();
    await store.put(key, [{ name: "Avgjort", words: ["a"] }]);

    // A different size on the same day must not pick up that board.
    const other = await runDaily("groups=20&words=20", morning, store);
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.categories).toHaveLength(20);

    // Nor the same size on a different day.
    const tomorrow = await runDaily("groups=15&words=15", new Date("2026-07-31T06:00:00Z"), store);
    expect(tomorrow.ok).toBe(true);
    if (!tomorrow.ok) return;
    expect(tomorrow.categories).toHaveLength(15);
  });

  it("still serves a board when the store cannot be read", async () => {
    // Storage is a consistency guarantee, not something the response depends
    // on. A KV outage must degrade to the old behaviour, not to a 500.
    const broken: BoardStore = {
      get: vi.fn(async () => {
        throw new Error("kv down");
      }),
      put: vi.fn(async () => {}),
    };
    const result = await runDaily("groups=15&words=15", morning, broken);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.categories).toHaveLength(15);
  });

  it("still serves a board when the store cannot be written", async () => {
    const broken: BoardStore = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {
        throw new Error("kv down");
      }),
    };
    const result = await runDaily("groups=15&words=15", morning, broken);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.categories).toHaveLength(15);
  });

  it("does not touch the store for a size it would reject anyway", async () => {
    const store: BoardStore = { get: vi.fn(async () => null), put: vi.fn(async () => {}) };
    expect((await runDaily("groups=20&words=25", morning, store)).ok).toBe(false);
    expect(store.get).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("agrees with the unfrozen path on the first call", async () => {
    // Freezing must not change which board a day gets, only pin it.
    const withStore = await runDaily("groups=15&words=15", morning, memoryBoardStore());
    const without = await runDaily("groups=15&words=15", morning);
    expect(withStore).toEqual(without);
  });
});
