import type { Theme } from "@/hooks/useTheme";

type Props = {
  theme: Theme;
  onChange: (theme: Theme) => void;
};

/**
 * Light/dark, sitting on the same row as the wordmark in the start sheet.
 *
 * It has no visible heading — the design dropped it — so the group carries the
 * name instead. Without that, a screen reader announces two buttons called
 * "Lys" and "Mørk" with nothing saying what they set.
 */
export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <div className="theme-toggle" role="group" aria-label="Fargetema">
      <button
        type="button"
        className="theme-toggle__option"
        aria-pressed={theme === "light"}
        onClick={() => onChange("light")}
      >
        ☀ Lys
      </button>
      <button
        type="button"
        className="theme-toggle__option"
        aria-pressed={theme === "dark"}
        onClick={() => onChange("dark")}
      >
        ☾ Mørk
      </button>
    </div>
  );
}
