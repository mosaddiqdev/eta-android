import { useEffect, useRef, useState } from "react";

/**
 * True for a moment after something finishes while it is on screen. A row that was already finished when the page
 * opened, or that finishes while nobody is looking, never celebrates.
 */
export function useJustFinished(finished: boolean, ms = 1600) {
  const was = useRef(finished);
  const [just, setJust] = useState(false);
  useEffect(() => {
    const arrived = finished && !was.current;
    was.current = finished;
    if (!arrived) return;
    setJust(true);
    const timer = window.setTimeout(() => setJust(false), ms);
    return () => window.clearTimeout(timer);
  }, [finished, ms]);
  return just;
}
