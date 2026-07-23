import type { JSX } from "preact";

/** Decorative rows of pill "word-tiles", echoing the game board's coloured group
 *  tiles. Rows are laid out with flex-grow so the segments always fit the width
 *  (responsive by construction); a trailing spacer leaves a ragged last line
 *  like a paragraph of text. Purely visual — hidden from assistive tech. */

type Seg = { hue: number | null; grow: number };

const ROWS: Seg[][] = [
  [
    { hue: 20, grow: 3 },
    { hue: 48, grow: 5 },
    { hue: 150, grow: 2 },
  ],
  [
    { hue: 200, grow: 4 },
    { hue: 265, grow: 2 },
    { hue: 320, grow: 3 },
  ],
  [
    { hue: 96, grow: 6 },
    { hue: 12, grow: 3 },
    { hue: null, grow: 4 },
  ],
];

export function TileField() {
  return (
    <div className="tile-field" aria-hidden="true">
      {ROWS.map((row, i) => (
        <div className="tile-field__row" key={i}>
          {row.map((seg, j) =>
            seg.hue === null ? (
              <div key={j} className="tile-field__spacer" style={{ flex: `${seg.grow} 1 0` }} />
            ) : (
              <span
                key={j}
                className="tile-field__pill"
                style={{ flex: `${seg.grow} 1 0`, "--h": seg.hue } as JSX.CSSProperties}
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
