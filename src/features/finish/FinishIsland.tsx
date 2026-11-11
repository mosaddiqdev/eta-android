import { Eraser } from "lucide-react";
import { useEffect, useRef } from "react";
import { ITEMS, KINDS, type UpgradeKind } from "../../engine/items";
import { preloadArtWhenIdle } from "../../game/art";
import { confirm, tick } from "../../ui/haptics";
import { Toaster } from "../../ui/Toaster";
import { toast } from "../../ui/toast";
import { useSwipeTabs } from "../../ui/useSwipeTabs";
import { BoostGrid } from "./controls/BoostGrid";
import { CategoryTabs } from "./controls/CategoryTabs";
import { EarlierUse } from "./controls/EarlierUse";
import { TimeCard } from "./controls/TimeCard";
import styles from "./FinishIsland.module.css";
import { ResultDock } from "./result/ResultDock";
import { useFinishTime } from "./useFinishTime";

// Every boost and tab picture, so switching category or entering a time never waits on one.
const KIND_IDS = KINDS.map(({ id }) => id);
const ART = [...ITEMS.map((item) => `items/${item.art}`), ...KINDS.map(({ id }) => `icons/${id}`)];

export default function FinishIsland() {
  const finish = useFinishTime();
  useEffect(() => preloadArtWhenIdle(ART), []);
  // Swiping the controls sideways steps through the categories, like the tabs do.
  const controlsRef = useRef<HTMLDivElement>(null);
  // Tapping a category and swiping to one are the same move, so they feel the same.
  const pickKind = (next: UpgradeKind) => {
    if (next === finish.kind) return;
    tick();
    finish.chooseKind(next);
  };
  useSwipeTabs(controlsRef, KIND_IDS, finish.kind, pickKind, true);

  return (
    <div className={styles.shell} data-kind={finish.kind}>
      <div ref={controlsRef} className={styles.controls}>
        <CategoryTabs value={finish.kind} timeLabel={finish.timeLabel} onChange={pickKind} />
        <TimeCard
          value={finish.time}
          enteredAt={finish.enteredAt}
          now={finish.now}
          onChange={finish.setTime}
          onClear={() => {
            confirm();
            const undo = finish.clearTime();
            toast("Time cleared", { tone: "neutral", icon: Eraser, action: { label: "Undo", run: undo } });
          }}
        />
        <BoostGrid
          kind={finish.kind}
          items={finish.items}
          counts={finish.counts}
          onChange={finish.setCount}
        />
        <EarlierUse minutes={finish.earlierMinutes} onChange={finish.setEarlierMinutes} />
      </div>
      <ResultDock plan={finish.plan} now={finish.now} />
      <Toaster />
    </div>
  );
}
