export type Category = {
  name: string;
  words: string[];
};

export type TileData = {
  id: string;
  words: string[];
  categoryName: string;
  hue?: number;
  row?: number;
};
