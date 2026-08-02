export type Category = {
  name: string;
  words: string[];
  /**
   * Names this category's description bundle at /descriptions/<slug>.json.
   *
   * Absent means "no descriptions for this category" — either none have been
   * written yet, or the board was frozen in KV before the field existed (see
   * FREEZE_TTL_SECONDS; a stale daily board ages out within two days). The
   * completed-game modal falls back to a plain word list either way.
   */
  slug?: string;
};

export type TileData = {
  id: string;
  words: string[];
  categoryName: string;
  hue?: number;
  row?: number;
  /** Hidden from the board after its category was completed; still counts as solved. */
  hidden?: boolean;
};
