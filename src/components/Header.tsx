import { useEffect, useRef, useState } from "preact/hooks";
import type { Ref } from "preact";
import { GAME_SIZES, type GameSize } from "@/lib/sizes";
import { ProgressBar } from "./ProgressBar";
import "./Header.css";

type Theme = "dark" | "light";

type Props = {
  groupCount: number;
  wordsPerGroup: number;
  completedCount: number;
  tileCount: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onNewGame: (size: GameSize) => void;
  /** Attached to the <header> so Game can measure its height and reserve room
   *  for it below the fixed bar. */
  headerRef?: Ref<HTMLElement>;
};

export function Header({
  groupCount,
  wordsPerGroup,
  completedCount,
  tileCount,
  theme,
  onThemeChange,
  onNewGame,
  headerRef,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Escape closes and hands focus back, the way every other popover behaves.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    // Tabbing past the last item used to leave the popover hanging open behind
    // the rest of the page; mousedown alone never saw it.
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && !wrapRef.current?.contains(next)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    const wrap = wrapRef.current;
    wrap?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      wrap?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  return (
    <header className="header" ref={headerRef}>
      {/* The visible wordmark lives in the start modal, which is gone once a
          game is running — leaving the document with no h1 at all. */}
      <h1 className="sr-only">Taksonomi</h1>
      <ProgressBar tileCount={tileCount} groupCount={groupCount} wordsPerGroup={wordsPerGroup} />
      <div className="header__bar">
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
          {/* Deliberately not role="menu"/"menuitem". Those roles are a
              contract: arrow-key navigation, Home/End, typeahead, focus moved
              into the menu on open, Tab closing it. This popover promised all
              of that and implemented none. It is eight ordinary buttons, so it
              says so — and Tab, the behaviour users then expect, just works. */}
          <div className="header__dropdown" ref={wrapRef}>
            <button
              ref={triggerRef}
              type="button"
              className="header__button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              Nytt spill ▾
            </button>
            {open && (
              <div className="header__menu">
                {GAME_SIZES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className="header__menu-item"
                    onClick={() => {
                      close(false);
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
      </div>
    </header>
  );
}
