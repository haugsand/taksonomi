import type { JSX } from "preact";

/** The palette, compressed to five pixels across the top of a sheet. The only
 *  decoration left in the modal, and the one thing carrying the board's colours
 *  into a screen that has no board on it. Purely visual. */
const HUES = [20, 90, 150, 190, 265, 320];

export function StripDecoration() {
  return (
    <div className="sheet__strip" aria-hidden="true">
      {HUES.map((hue) => (
        <span key={hue} style={{ "--h": hue } as JSX.CSSProperties} />
      ))}
    </div>
  );
}
