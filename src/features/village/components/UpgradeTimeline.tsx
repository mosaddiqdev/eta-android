import { SegmentTimeline, type Stretch } from "../../../ui/SegmentTimeline";
import type { PlannedUpgrade } from "../../../village/plan";
import { when } from "../format";
import { boostersAt } from "../rows";

interface Props {
  upgrade: PlannedUpgrade;
  exportedAt: number;
  now: number;
  helperArt: string | null;
}

/** An upgrade's stretches from now on, in the shared timeline. */
export function UpgradeTimeline({ upgrade: u, exportedAt, now, helperArt }: Props) {
  const rel = now - exportedAt;
  const segments: Stretch[] = u.projection.segments
    .map((s) => ({ ...s, id: s.start, start: Math.max(s.start, rel) }))
    .filter((s) => s.end > s.start);

  return (
    <SegmentTimeline
      segments={segments}
      boostersFor={(s) => boostersAt(u, s.start, helperArt)}
      startsAt={(s) => when(exportedAt + s.start, now)}
    />
  );
}
