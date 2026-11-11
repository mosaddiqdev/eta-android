import type { BoostItem } from "../../engine/items";
import { formatDuration } from "../../engine/time";
import type { Plan } from "./useFinishTime";

export interface Suggestion {
  item: BoostItem;
  amount: number;
  change: "fewer" | "more";
}

export interface Verdict {
  tone: "none" | "good" | "short";
  title: string;
  lead?: string;
  options: Suggestion[];
}

export function describeSuggestion({ item, amount, change }: Suggestion) {
  return `${amount} ${change} ${item.label}${amount === 1 ? "" : "s"}`;
}

// Each option is true on its own with the other boosts left as entered, never as a combination,
// so the wording offers a choice instead of a shopping list.
export function verdictFor({ result, boosts }: Plan): Verdict {
  if (result.boostEnd === 0) return { tone: "none", title: "No boost running", options: [] };

  if (result.insideBoost) {
    const options = boosts.flatMap(({ item, count, needed }) =>
      needed !== null && count > needed ? [{ item, amount: count - needed, change: "fewer" as const }] : [],
    );
    return {
      tone: "good",
      title: "Boost covers it",
      lead: options.length ? "Could use fewer" : undefined,
      options,
    };
  }

  // Fewest extra uses first; ties keep the game's order, which puts the potion ahead of the snack.
  const options = boosts
    .flatMap(({ item, count, needed }) =>
      needed !== null && needed > count ? [{ item, amount: needed - count, change: "more" as const }] : [],
    )
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 2);
  return {
    tone: "short",
    title: "Boost runs out first",
    lead: options.length
      ? "Add to finish in the boost"
      : `${formatDuration(result.leftAfterBoost)} left at normal speed`,
    options,
  };
}
