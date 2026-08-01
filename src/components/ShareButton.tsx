import { useEffect, useRef, useState } from "preact/hooks";
import { shareResult, type ShareOutcome } from "@/lib/share";

/** How long the button holds the outcome before offering the action again. */
const OUTCOME_MS = 2600;

function CopyIcon() {
  return (
    <svg className="share-button__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="share-button__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

/**
 * Shares the day's result, and says so in its own label.
 *
 * The outcome belongs *in* the button. Reported beside it, the only thing that
 * changed when you pressed was a line of small print somewhere else — and a
 * clipboard write is otherwise completely silent.
 */
export function ShareButton({ text }: { text: string }) {
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetRef.current), []);

  async function share() {
    const result = await shareResult(text);
    setOutcome(result);
    // Hand the button back afterwards. Left as-is it reports an event that has
    // stopped being true and no longer looks pressable.
    clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => setOutcome(null), OUTCOME_MS);
  }

  const done = outcome === "copied" || outcome === "shared";
  const label =
    outcome === "copied"
      ? "Kopiert til utklippstavla"
      : outcome === "shared"
        ? "Delt"
        : outcome === "failed"
          ? "Kunne ikke dele"
          : "Del resultat";

  return (
    <>
      <button type="button" className="share-button" onClick={share}>
        {done ? <CheckIcon /> : <CopyIcon />}
        {label}
      </button>
      {/* A changed button label is not announced on its own, so the same
          message goes out through a live region as well. */}
      <p className="sr-only" role="status">
        {outcome === "copied" && "Kopiert til utklippstavla."}
        {outcome === "shared" && "Resultatet er delt."}
        {outcome === "failed" && "Kunne ikke dele."}
      </p>
    </>
  );
}
