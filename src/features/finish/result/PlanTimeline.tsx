import { HOUR } from "../../../engine/items";
import { artFit, artUrl } from "../../../game/art";
import { SegmentTimeline, type Stretch } from "../../../ui/SegmentTimeline";
import type { Booster } from "../../../ui/SourceStack";
import { finishParts } from "../format";
import type { Plan } from "../useFinishTime";

/** The calculator's stretches from now on, in the same timeline the village drawer uses. */
export function PlanTimeline({ plan, now }: { plan: Plan; now: number }) {
  // The stretches are measured from when the plan was made; the ones already run are eaten away as the clock goes on.
  const run = Math.max(0, Math.floor((now - plan.startedAt) / 1000));
  const segments: Stretch[] = plan.result.segments
    .map((s) => ({ ...s, id: s.start, start: Math.max(s.start, run) }))
    .filter((s) => s.end > s.start);

  // Potion in front of snack, as on a row. A boost is running in a stretch while it still has time left at its start.
  const sources = [...plan.boosts]
    .sort((a, b) => Number(a.item.type === "snack") - Number(b.item.type === "snack"))
    .map(({ item, count }) => ({
      count,
      booster: {
        id: item.id,
        label: item.label,
        art: artUrl(`items/${item.art}`),
        fit: artFit(`items/${item.art}`),
      } satisfies Booster,
    }));
  const running = (s: Stretch) =>
    sources.filter(({ count }) => count * HOUR - plan.usedAgo > s.id).map(({ booster }) => booster);

  return (
    <SegmentTimeline
      segments={segments}
      boostersFor={running}
      startsAt={(s) => {
        const { day, time } = finishParts(plan.startedAt + s.id * 1000, now);
        return `${day}, ${time}`;
      }}
    />
  );
}
