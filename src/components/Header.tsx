import { useEffect, useRef, useState } from "preact/hooks";
import { GAME_SIZES, type GameSize } from "@/lib/sizes";
import "./Header.css";

type Theme = "dark" | "light";

type Props = {
  groupCount: number;
  completedCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onNewGame: (size: GameSize) => void;
};

export function Header({ groupCount, completedCount, theme, onThemeChange, onNewGame }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <header className="header">
      <p className="header__progress">
        {completedCount} av {groupCount} kategorier fullført
      </p>
      <div className="header__controls">
        <button
          type="button"
          className="header__theme-toggle"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <div className="header__dropdown" ref={wrapRef}>
          <button
            type="button"
            className="header__button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            Nytt spill ▾
          </button>
          {open && (
            <div className="header__menu" role="menu">
              {GAME_SIZES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  role="menuitem"
                  className="header__menu-item"
                  onClick={() => {
                    setOpen(false);
                    onNewGame(s);
                  }}
                >
                  {s.groups} × {s.wordsPerGroup}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
