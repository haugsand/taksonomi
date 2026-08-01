import type { JSX } from "preact";

/**
 * Two worked examples of the one move the game has, shown directly under the
 * rules they illustrate.
 *
 * The second is the one that actually teaches something. The first shows two
 * loose words merging, which the rules already say; the second shows a *group*
 * taking another word, which is how every category after the first pair is
 * finished and is not obvious from the text.
 *
 * The words are hard-coded and must stay that way. Pulling them from the
 * current board — daily or free — would hand out an answer, which is the same
 * rule that governs announce.ts.
 *
 * Each row is one node to assistive tech rather than four unexplained words,
 * because the chips only mean something laid out side by side.
 */

const GROUP_HUE = 40;

export function WordSample() {
  return (
    <div className="sheet__samples">
      <div
        className="sheet__sample"
        role="img"
        aria-label="Eksempel: obo og cello slås sammen til én gruppe."
      >
        <span className="sheet__sample-word">obo</span>
        <span className="sheet__sample-word">cello</span>
        <span className="sheet__sample-becomes" aria-hidden="true">
          ⇒
        </span>
        <span
          className="sheet__sample-word sheet__sample-word--merged"
          style={{ "--h": GROUP_HUE } as JSX.CSSProperties}
        >
          obo · cello
        </span>
      </div>

      <div
        className="sheet__sample"
        role="img"
        aria-label="Eksempel: gruppen obo og cello tar imot fiolin og blir en gruppe på tre."
      >
        <span
          className="sheet__sample-word sheet__sample-word--merged"
          style={{ "--h": GROUP_HUE } as JSX.CSSProperties}
        >
          obo · cello
        </span>
        <span className="sheet__sample-word">fiolin</span>
        <span className="sheet__sample-becomes" aria-hidden="true">
          ⇒
        </span>
        <span
          className="sheet__sample-word sheet__sample-word--merged"
          style={{ "--h": GROUP_HUE } as JSX.CSSProperties}
        >
          obo · cello · fiolin
        </span>
      </div>
    </div>
  );
}
