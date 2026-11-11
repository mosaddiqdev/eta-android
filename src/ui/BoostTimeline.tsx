import { forecast } from "../engine/finish";
import { HOUR, ITEMS } from "../engine/items";
import { formatClock } from "../engine/time";
import { artFit, artUrl } from "../game/art";
import { SegmentTimeline, type Stretch } from "./SegmentTimeline";
import type { Booster } from "./SourceStack";

interface Props {
  /** Seconds the upgrade has left before any boost. */
  left: number;
  /** What is used right now: an item id from `ITEMS` and how many of it. */
  uses: { id: string; count: number }[];
}

/**
 * A worked example drawn with the same timeline as the calculator and the village drawer, pictures included.
 * Used where a page explains boosts with fixed numbers (the About sheet, the guide). On an Astro page it needs a
 * `client:` directive, or the pills do not scroll and the bar does not react.
 */
export function BoostTimeline({ left, uses }: Props) {
  // Potion in front of snack, as on a row.
  const sources = uses
    .map(({ id, count }) => ({ item: ITEMS.find((i) => i.id === id), count }))
    .flatMap(({ item, count }) => (item ? [{ item, count }] : []))
    .sort((a, b) => Number(a.item.type === "snack") - Number(b.item.type === "snack"));

  const result = forecast(
    left,
    sources.map(({ item, count }) => ({ bonus: item.bonus, count, usedAgo: 0 })),
  );
  const segments: Stretch[] = result.segments.map((s) => ({ ...s, id: s.start }));

  // A boost runs in a stretch while it still has time left at the stretch's start.
  const running = (s: Stretch) =>
    sources
      .filter(({ count }) => count * HOUR > s.id)
      .map(
        ({ item }): Booster => ({
          id: item.id,
          label: item.label,
          art: artUrl(`items/${item.art}`),
          fit: artFit(`items/${item.art}`),
        }),
      );

  return (
    <SegmentTimeline
      segments={segments}
      boostersFor={running}
      startsAt={(s) => (s.start === 0 ? "now" : `after ${formatClock(s.start)}`)}
    />
  );
}
