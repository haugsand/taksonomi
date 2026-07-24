export type GameSize = {
  label: string;
  groups: number;
  wordsPerGroup: number;
};

export const GAME_SIZES: GameSize[] = [
  { label: "XXS", groups: 5, wordsPerGroup: 5 },
  { label: "XS", groups: 10, wordsPerGroup: 10 },
  { label: "S", groups: 15, wordsPerGroup: 15 },
  { label: "M", groups: 20, wordsPerGroup: 20 },
  { label: "L", groups: 25, wordsPerGroup: 25 },
  { label: "XL", groups: 30, wordsPerGroup: 30 },
  { label: "XXL", groups: 35, wordsPerGroup: 35 },
  { label: "XXXL", groups: 40, wordsPerGroup: 40 },
];

/**
 * The offered size matching these counts, or undefined. The API accepts only
 * these pairs, so nothing — a stored size, a hand-written query string — can
 * ask for a board the UI never renders.
 */
export function findGameSize(groups: number, wordsPerGroup: number): GameSize | undefined {
  return GAME_SIZES.find((s) => s.groups === groups && s.wordsPerGroup === wordsPerGroup);
}
