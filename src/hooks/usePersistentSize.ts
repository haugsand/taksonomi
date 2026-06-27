import { useEffect, useState } from "preact/hooks";
import { loadSize, saveSize, type Size } from "@/lib/storage";

/** Board-size state, initialised from and persisted to localStorage. */
export function usePersistentSize(): [Size, (size: Size) => void] {
  const [size, setSize] = useState<Size>(loadSize);

  useEffect(() => {
    saveSize(size);
  }, [size]);

  return [size, setSize];
}
