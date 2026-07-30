import { afterEach, describe, expect, it } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useAnnouncer, type Announcement } from "@/hooks/useAnnouncer";
import { LiveRegion } from "./LiveRegion";

let root: HTMLElement;

function mount(announcement: Announcement | null) {
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(<LiveRegion announcement={announcement} />, root);
  });
  return root.firstElementChild as HTMLElement;
}

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
  }
});

describe("LiveRegion", () => {
  it("is a polite status region that is not visible", () => {
    const region = mount(null);
    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.className).toContain("sr-only");
  });

  it("renders the current message", () => {
    const region = mount({ text: "Slått sammen.", seq: 1 });
    expect(region.textContent).toBe("Slått sammen.");
  });

  it("replaces the text node when the same message repeats", () => {
    // Screen readers skip a live region whose text is unchanged, so two
    // mismatches in a row would announce once. Keying on `seq` forces a new
    // node; asserting on node identity is the only way to see that happen.
    const region = mount({ text: "Nei — de hører ikke sammen.", seq: 1 });
    const first = region.firstChild;

    act(() => {
      render(<LiveRegion announcement={{ text: "Nei — de hører ikke sammen.", seq: 2 }} />, root);
    });

    expect(region.textContent).toBe("Nei — de hører ikke sammen.");
    expect(region.firstChild).not.toBe(first);
  });
});

describe("useAnnouncer", () => {
  function mountAnnouncer() {
    const host = document.createElement("div");
    let api!: [Announcement | null, (text: string) => void];
    const Probe = () => {
      api = useAnnouncer();
      return null;
    };
    act(() => {
      render(<Probe />, host);
    });
    return {
      get current() {
        return api[0];
      },
      announce: (text: string) => act(() => api[1](text)),
    };
  }

  it("starts silent", () => {
    expect(mountAnnouncer().current).toBeNull();
  });

  it("increments seq on every call, including repeats", () => {
    const a = mountAnnouncer();
    a.announce("samme");
    expect(a.current).toEqual({ text: "samme", seq: 1 });

    a.announce("samme");
    expect(a.current).toEqual({ text: "samme", seq: 2 });

    a.announce("noe annet");
    expect(a.current).toEqual({ text: "noe annet", seq: 3 });
  });
});
