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
