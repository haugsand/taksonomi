import { useEffect, useState } from "preact/hooks";

/**
 * Whether the tab is currently visible.
 *
 * The daily clock pauses when it isn't. That is a deliberate kindness rather
 * than an anti-cheat measure — it can obviously be gamed — but a phone call in
 * the middle of a 35×35 board should not ruin the run, and there is nothing to
 * defend anyway when the times are self-reported.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}
