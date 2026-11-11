import { Check, Minus, Plus } from "lucide-react";
import { type CSSProperties, useMemo, useRef, useState } from "react";
import { type BoostItem, speedOf } from "../../../engine/items";
import { formatDuration } from "../../../engine/time";
import { artUrl } from "../../../game/art";
import { confirm, tick } from "../../../ui/haptics";
import { HOUR } from "../../../village/constants";
import { potionImpact } from "../../../village/potion";
import type { PotionUse, Scenario } from "../../../village/scenario";
import type { Account } from "../../../village/types";
import { LANE_ONE } from "../format";
import styles from "./PotionCard.module.css";

const NOUN = { builder: "builder", lab: "research", pet: "pet" } as const;

interface Props {
  item: BoostItem;
  source: PotionUse["source"];
  lane: PotionUse["lane"];
  account: Account;
  scenario: Scenario;
  onSet: (use: Omit<PotionUse, "at">) => void;
}

export function PotionCard({ item, source, lane, account, scenario, onSet }: Props) {
  const planned = scenario.potions.find((u) => u.source === source && u.lane === lane);
  const [draft, setDraft] = useState(1);
  const number = useRef<HTMLOutputElement>(null);
  const count = planned?.count ?? draft;

  const impact = useMemo(() => {
    const others = {
      ...scenario,
      potions: scenario.potions.filter((u) => !(u.source === source && u.lane === lane)),
    };
    return potionImpact(account, { source, lane, count, at: scenario.now }, scenario.now, others);
  }, [account, scenario, source, lane, count]);

  if (impact.potential === 0) return null;

  const percent = Math.round(impact.efficiency * 100);
  const perWorker = item.bonus * count * HOUR;
  const idle =
    account.capacity[lane] === null
      ? 0
      : (account.capacity[lane] ?? 0) - account.upgrades.filter((u) => u.lane === lane && !u.goblin).length;
  const weakest = [...impact.perUpgrade].sort((a, b) => a.work - b.work)[0];
  const reason =
    idle > 0
      ? `${idle} idle ${LANE_ONE[lane]}${idle > 1 ? "s" : ""} would waste ${formatDuration(idle * perWorker)}.`
      : weakest && weakest.work < perWorker * 0.95
        ? `${weakest.name} only uses ${formatDuration(weakest.work)} of ${formatDuration(perWorker)}.`
        : null;

  const change = (next: number) => {
    const value = Math.min(9, Math.max(1, next));
    setDraft(value);
    tick();
    // The same small nudge as the Finish time counters, so a change reads under a thumb.
    if (value !== count && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      number.current?.animate([{}, { transform: "scale(1.18)" }, {}], {
        duration: 180,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      });
    }
    if (planned) onSet({ source, lane, count: value });
  };

  return (
    <article className={styles.card} data-planned={!!planned} data-kind={lane}>
      <img src={artUrl(`items/${item.art}`)} alt="" width={44} height={44} draggable={false} />
      <div className={styles.body}>
        <h4>
          {item.label} <span>{speedOf(item)}x</span>
        </h4>
        <p className={styles.gain}>
          Saves <strong>{formatDuration(impact.work)}</strong> of {NOUN[lane]} time
        </p>
        <div className={styles.meterRow}>
          {/* biome-ignore lint/a11y/useSemanticElements: a custom-styled bar; the native <meter> cannot be styled consistently across browsers */}
          <span
            className={styles.meter}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Share of the boost that is used"
          >
            <span style={{ "--p": percent / 100 } as CSSProperties} />
          </span>
          <span className={styles.pct}>{percent}% used</span>
        </div>
        {reason && <p className={styles.reason}>{reason}</p>}
      </div>
      <div className={styles.controls}>
        <div className={styles.stepper}>
          <button
            type="button"
            aria-label={`Fewer ${item.label}`}
            onClick={() => change(count - 1)}
            disabled={count <= 1}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <output ref={number}>{count}</output>
          <button
            type="button"
            aria-label={`More ${item.label}`}
            onClick={() => change(count + 1)}
            disabled={count >= 9}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className={styles.plan}
          aria-pressed={!!planned}
          onClick={() => {
            confirm();
            onSet({ source, lane, count: planned ? 0 : count });
          }}
        >
          {planned ? (
            <>
              <Check size={16} aria-hidden="true" />
              Planned
            </>
          ) : (
            "Plan it"
          )}
        </button>
      </div>
    </article>
  );
}
