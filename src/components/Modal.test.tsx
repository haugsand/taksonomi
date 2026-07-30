import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Modal } from "./Modal";

let root: HTMLElement;

/** happy-dom implements <dialog> but not showModal/close, so stand them in.
 *  The assertions below are about *our* contract — that showModal is used at
 *  all, that focus is restored, that cancel is refused without onClose — not
 *  about re-testing the browser's focus trap. */
function installDialogStubs() {
  const proto = globalThis.HTMLDialogElement?.prototype as
    (HTMLDialogElement & { showModal?: () => void; close?: () => void }) | undefined;
  if (!proto) throw new Error("HTMLDialogElement missing from the test DOM");

  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
    this.querySelector<HTMLElement>("button")?.focus();
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  proto.showModal = showModal;
  proto.close = close;
  return { showModal, close };
}

let stubs: ReturnType<typeof installDialogStubs>;

function mount(props: { onClose?: () => void; bleed?: boolean } = {}) {
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(
      <Modal ariaLabel="Testdialog" {...props}>
        <button type="button">Første</button>
        <button type="button">Andre</button>
      </Modal>,
      root,
    );
  });
  return root.querySelector("dialog")!;
}

beforeEach(() => {
  stubs = installDialogStubs();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (root) {
    render(null, root);
    root.remove();
  }
  document.body.innerHTML = "";
});

describe("Modal", () => {
  it("opens as a modal dialog, not an inline one", () => {
    // showModal() is the whole point: it is what traps focus, makes the rest of
    // the page inert and handles Esc. show() or a plain div would not.
    mount();
    expect(stubs.showModal).toHaveBeenCalledTimes(1);
  });

  it("labels itself for assistive tech", () => {
    expect(mount().getAttribute("aria-label")).toBe("Testdialog");
  });

  it("does not hand-roll role or aria-modal, which <dialog> provides", () => {
    const dialog = mount();
    expect(dialog.hasAttribute("role")).toBe(false);
    expect(dialog.hasAttribute("aria-modal")).toBe(false);
  });

  it("restores focus to the opener when it unmounts", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    mount();
    expect(document.activeElement).not.toBe(opener);

    act(() => render(null, root));
    expect(document.activeElement).toBe(opener);
  });

  it("closes the dialog on unmount so it cannot linger in the top layer", () => {
    mount();
    act(() => render(null, root));
    expect(stubs.close).toHaveBeenCalled();
  });

  it("re-opens if it is rendered again while still mounted", () => {
    // A closed <dialog> is display:none, so a Modal that stays mounted with a
    // closed dialog is an invisible modal. CompletedBoard keeps this component
    // mounted and swaps its children between categories, which is exactly that
    // case — and an open-on-mount-only effect left the second category showing
    // nothing at all.
    const dialog = mount({ onClose: () => {} });
    expect(dialog.open).toBe(true);

    act(() => dialog.close());
    expect(dialog.open).toBe(false);

    act(() => {
      render(
        <Modal ariaLabel="Testdialog" onClose={() => {}}>
          <button type="button">Ny</button>
        </Modal>,
        root,
      );
    });
    expect(dialog.open).toBe(true);
    expect(stubs.showModal).toHaveBeenCalledTimes(2);
  });

  it("does not re-open a dialog that is already open", () => {
    mount({ onClose: () => {} });
    act(() => {
      render(
        <Modal ariaLabel="Testdialog" onClose={() => {}}>
          <button type="button">Endret</button>
        </Modal>,
        root,
      );
    });
    // showModal() on an open dialog throws InvalidStateError, so the guard is
    // load-bearing, not just an optimisation.
    expect(stubs.showModal).toHaveBeenCalledTimes(1);
  });
});

describe("Modal dismissal", () => {
  const cancel = (dialog: HTMLDialogElement) =>
    dialog.dispatchEvent(new Event("cancel", { cancelable: true, bubbles: false }));

  it("calls onClose when Esc cancels it", () => {
    const onClose = vi.fn();
    const dialog = mount({ onClose });
    act(() => void cancel(dialog));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("refuses to be cancelled when it has no onClose", () => {
    // The start screen is a required choice: Esc must not leave the player on
    // an empty board with no way back.
    const dialog = mount();
    let defaultPrevented = false;
    act(() => {
      const e = new Event("cancel", { cancelable: true });
      dialog.dispatchEvent(e);
      defaultPrevented = e.defaultPrevented;
    });
    expect(defaultPrevented).toBe(true);
  });

  it("treats a click on the dialog itself as a backdrop click", () => {
    const onClose = vi.fn();
    const dialog = mount({ onClose });
    act(() => dialog.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks on the content", () => {
    const onClose = vi.fn();
    const dialog = mount({ onClose });
    act(() => dialog.querySelector<HTMLElement>(".modal__content")!.click());
    act(() => dialog.querySelector("button")!.click());
    expect(onClose).not.toHaveBeenCalled();
  });
});
