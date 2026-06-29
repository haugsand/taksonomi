import { useEffect, useRef, useState } from "preact/hooks";
import { GAME_SIZES, type GameSize } from "@/lib/sizes";
import "./Header.css";

type Theme = "dark" | "light";

type Props = {
  groupCount: number;
  wordsPerGroup: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onNewGame: (size: GameSize) => void;
};

export function Header({ groupCount, wordsPerGroup, theme, onThemeChange, onNewGame }: Props) {
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
      <h1 style={{ margin: 0, fontSize: "1rem" }}>
        Taksonomi ({groupCount} x {wordsPerGroup})
      </h1>
      <div className="header__controls">
        <button
          type="button"
          className="header__theme-toggle"
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
        >
          {theme === "dark" ? "☀️ Lys" : "🌙 Mørk"}
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
                  <span className="header__menu-label">
                    {s.groups} × {s.wordsPerGroup}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
