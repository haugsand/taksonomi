// Vitest's happy-dom environment does not expose `localStorage` / `sessionStorage`
// as globals — they're missing from Vitest's window→global key allow-list, even
// though happy-dom itself implements them. Modules that persist to localStorage
// (see storage.ts) therefore see `undefined` under test. Install a minimal
// in-memory Storage so those modules are exercisable. Guarded so a future runtime
// that does provide Storage keeps its own.

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  // Inspect via the descriptor rather than reading the value: Node 22 exposes an
  // experimental `localStorage` accessor that logs a warning when read, and we
  // want our clean in-memory Storage in tests regardless. Only skip if an
  // existing property can't be redefined.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}
