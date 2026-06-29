import { useState } from "preact/hooks";
import { THEME_KEY } from "@/lib/constants";

export type Theme = "dark" | "light";

/** Resolves the effective theme from the color-scheme set on <html> (applied by
 *  the pre-paint script when an override is saved), falling back to the OS
 *  preference while no explicit override is in place. */
function currentTheme(): Theme {
  const forced = document.documentElement.style.colorScheme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Theme toggle backed by the `color-scheme` of <html>. CSS light-dark() reads
 *  that scheme directly. The chosen theme is persisted so it survives a reload;
 *  with nothing saved, the meta tag's "light dark" follows the OS. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  function setTheme(next: Theme) {
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
    setThemeState(next);
  }

  return [theme, setTheme];
}
