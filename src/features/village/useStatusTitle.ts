import { useEffect, useState } from "react";
import { statusTitle } from "./statusTitle";

/**
 * Puts the next finish time in the browser tab's title, so a glance at the tab bar answers "how long?" without
 * opening the page. The page's own title comes back when the village screen goes away.
 */
export function useStatusTitle(next: { name: string; finishAt: number } | undefined, now: number) {
  const [base] = useState(() => (typeof document === "undefined" ? "" : document.title));
  const title = statusTitle(next, now, base);
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(
    () => () => {
      document.title = base;
    },
    [base],
  );
}
