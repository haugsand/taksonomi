import { useEffect, useState } from "preact/hooks";
import { loadTheme, saveTheme, type Theme } from "@/lib/storage";

/** Theme state synced to <html data-theme> and localStorage. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = loadTheme();
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  return [theme, setTheme];
}
