import { useEffect, useMemo, useState } from "react";
import { type BoostInput, fewestToFinish, forecast } from "../../engine/finish";
import { initialCounts, itemsFor, KINDS, type UpgradeKind } from "../../engine/items";
import { type Duration, formatDuration, toSeconds } from "../../engine/time";

const KIND_KEY = "clasheta.kind";
const EMPTY_TIME: Duration = { days: 0, hours: 0, minutes: 0, seconds: 0 };

// A builder upgrade, a lab upgrade and a pet upgrade run side by side, so each tab keeps its own clock.
const perKind = <T>(value: T) =>
  Object.fromEntries(KINDS.map(({ id }) => [id, value])) as Record<UpgradeKind, T>;

export type FinishTime = ReturnType<typeof useFinishTime>;
export type Plan = NonNullable<FinishTime["plan"]>;

// Storage throws in some private-browsing modes, so a failed read or write just means "not remembered".
function readSavedKind(): UpgradeKind | null {
  try {
    const saved = localStorage.getItem(KIND_KEY);
    return KINDS.find((kind) => kind.id === saved)?.id ?? null;
  } catch {
    return null;
  }
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function useFinishTime() {
  // Read synchronously: the island renders only in the browser (client:only), so the saved tab is right on the very first paint.
  const [kind, setKind] = useState<UpgradeKind>(() => readSavedKind() ?? "builder");
  const [times, setTimes] = useState(() => perKind(EMPTY_TIME));
  // When each tab's time was typed. The game's clock keeps running after that, so the time left is counted down from here.
  const [enteredAt, setEnteredAt] = useState(() => perKind(0));
  const [allCounts, setAllCounts] = useState(initialCounts);
  const [allEarlier, setAllEarlier] = useState(() => perKind(0));
  const now = useNow();

  const items = useMemo(() => itemsFor(kind), [kind]);
  const counts = allCounts[kind];
  const time = times[kind];
  const typedAt = enteredAt[kind];
  const earlierMinutes = allEarlier[kind];

  const plan = useMemo(() => {
    const typed = toSeconds(time);
    if (typed <= 0) return null;
    // Changing a boost doesn't restart the clock: what is left is the typed time minus what has run since it was typed.
    const startedAt = Date.now();
    const remaining = Math.max(0, typed - Math.floor((startedAt - typedAt) / 1000));

    const inputs: BoostInput[] = items.map((item) => ({
      bonus: item.bonus,
      count: counts[item.id] ?? 0,
      usedAgo: earlierMinutes * 60,
    }));
    const result = forecast(remaining, inputs);
    const boosts = items.map((item, index) => ({
      item,
      count: inputs[index].count,
      needed: fewestToFinish(remaining, inputs, index),
    }));

    return {
      remaining,
      startedAt,
      usedAgo: earlierMinutes * 60,
      finishAt: startedAt + result.finish * 1000,
      result,
      boosts,
    };
  }, [time, typedAt, items, counts, earlierMinutes]);

  function chooseKind(next: UpgradeKind) {
    setKind(next);
    try {
      localStorage.setItem(KIND_KEY, next);
    } catch {}
  }

  const setTime = (next: Duration) => {
    setTimes((current) => ({ ...current, [kind]: next }));
    setEnteredAt((current) => ({ ...current, [kind]: Date.now() }));
  };
  /** Empties this tab's time and returns the way back, which also restores when it was typed so the countdown carries on. */
  function clearTime() {
    const tab = kind;
    const before = { time: times[tab], at: enteredAt[tab] };
    setTime(EMPTY_TIME);
    return () => {
      setTimes((current) => ({ ...current, [tab]: before.time }));
      setEnteredAt((current) => ({ ...current, [tab]: before.at }));
    };
  }
  const setEarlierMinutes = (minutes: number) =>
    setAllEarlier((current) => ({ ...current, [kind]: minutes }));

  function setCount(id: string, count: number) {
    setAllCounts((current) => ({ ...current, [kind]: { ...current[kind], [id]: count } }));
  }

  return {
    kind,
    chooseKind,
    time,
    enteredAt: typedAt,
    setTime,
    clearTime,
    /** What each tab already holds, so a tab you aren't on can show its time instead of a mystery mark. */
    timeLabel: Object.fromEntries(
      KINDS.map(({ id }) => [id, toSeconds(times[id]) > 0 ? formatDuration(toSeconds(times[id])) : null]),
    ) as Record<UpgradeKind, string | null>,
    items,
    counts,
    setCount,
    earlierMinutes,
    setEarlierMinutes,
    plan,
    now,
  };
}
