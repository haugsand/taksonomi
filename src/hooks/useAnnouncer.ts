import { useCallback, useState } from "preact/hooks";

export type Announcement = { text: string; seq: number };

/**
 * A queue of one message for the board's live region.
 *
 * `seq` exists for a specific reason: screen readers do not re-announce a live
 * region whose text is unchanged. Two mismatches in a row produce the identical
 * string, so without something to force a new DOM node the second one would be
 * silent — exactly when the player most needs telling. LiveRegion keys its
 * child on `seq`, so every call remounts the node and speaks again.
 */
export function useAnnouncer(): [Announcement | null, (text: string) => void] {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const announce = useCallback((text: string) => {
    setAnnouncement((prev) => ({ text, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  return [announcement, announce];
}
