import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import "./Modal.css";

type Props = {
  ariaLabel: string;
  /** Called on Esc and backdrop click. Omit to make the modal non-dismissable. */
  onClose?: () => void;
  children: ComponentChildren;
};

/** Generic centered dialog: dimmed backdrop, fade + scale entrance, focuses its
 *  first control. With `onClose` set it closes on Esc or backdrop click. */
export function Modal({ ariaLabel, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("button, [tabindex]")?.focus();
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
