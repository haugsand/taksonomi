import type { Announcement } from "@/hooks/useAnnouncer";

type Props = {
  announcement: Announcement | null;
};

/**
 * The board's spoken channel. Merges, mismatches and completed categories are
 * otherwise conveyed only by animation and colour, which is nothing at all to a
 * screen-reader user.
 *
 * `polite` rather than `assertive`: the messages narrate the player's own
 * action, so interrupting them mid-sentence would be worse than queueing. The
 * `key` on the inner span is load-bearing — see useAnnouncer.
 */
export function LiveRegion({ announcement }: Props) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement && <span key={announcement.seq}>{announcement.text}</span>}
    </div>
  );
}
