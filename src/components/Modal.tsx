import { useLayoutEffect, useRef } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";
import "./Modal.css";

type Props = {
  ariaLabel: string;
  /** Called on Esc and backdrop click. Omit to make the modal non-dismissable. */
  onClose?: () => void;
  /** Drop the default padding/centering so a child can render edge-to-edge (e.g.
   *  a full-bleed poster header). The child then owns its own spacing. */
  bleed?: boolean;
  children: ComponentChildren;
};

/**
 * Generic centered dialog, built on the native `<dialog>` element.
 *
 * `showModal()` is what makes this correct rather than merely convincing: the
 * browser traps focus inside the dialog, makes the rest of the page inert,
 * handles Esc, and renders in the top layer. The hand-rolled version this
 * replaces focused its first button and stopped there, so Tab walked straight
 * out to the header controls behind the backdrop — reachable, invisible and
 * still clickable.
 *
 * Two things the platform does not hand us, both handled below: focus is only
 * restored for dialogs the browser itself closes, and light dismiss (clicking
 * the backdrop) is not yet available everywhere.
 */
export function Modal({ ariaLabel, onClose, bleed, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Read through a ref so the effect below can stay mount-only: re-running it
  // would close and reopen the dialog on every parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount-only: remember who opened us, and clean up on the way out. Declared
  // before the opening effect below so it captures focus while it is still on
  // the opener.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    return () => {
      if (dialog.open) dialog.close();
      // Without this, dismissing a modal drops focus to <body> and a keyboard
      // user restarts from the top of the page.
      previouslyFocused?.focus?.();
    };
  }, []);

  // Deliberately runs on every render, not just on mount: the invariant is
  // "rendered means open", and a caller that keeps this component mounted while
  // swapping its children (CompletedBoard does) would otherwise be left with a
  // closed <dialog> — which is `display: none`, so the modal silently vanishes.
  // showModal() is what earns us the focus trap, page inertness and Esc, so it
  // has to be re-asserted rather than assumed. The `open` guard makes it a
  // no-op on ordinary re-renders, and useLayoutEffect keeps it synchronous with
  // the commit so the dialog is never painted closed.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  });

  // Esc fires `cancel` before `close`. A modal with no onClose is a required
  // choice (the start screen), so it declines to be cancelled at all.
  const onCancel = (e: Event) => {
    e.preventDefault();
    onCloseRef.current?.();
  };

  // Light dismiss: a click whose target is the <dialog> itself landed on the
  // backdrop — the content lives in a child that would otherwise be the target.
  const onClick = (e: JSX.TargetedMouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onCloseRef.current?.();
  };

  return (
    <dialog
      ref={dialogRef}
      className={bleed ? "modal modal--bleed" : "modal"}
      aria-label={ariaLabel}
      onCancel={onCancel}
      onClick={onClick}
    >
      <div className="modal__content">{children}</div>
    </dialog>
  );
}
