import { useState } from "react";

export type TabDirection = "next" | "prev";

/**
 * Which way the tabs just moved, so the new panel can slide in from that side: later tab from the right, earlier tab
 * from the left. Derived while rendering (no effect, no extra frame), so the panel and its direction change together.
 */
export function useTabDirection(index: number): TabDirection {
  const [seen, setSeen] = useState<{ index: number; direction: TabDirection }>({ index, direction: "next" });
  if (seen.index !== index) setSeen({ index, direction: index > seen.index ? "next" : "prev" });
  return seen.direction;
}
