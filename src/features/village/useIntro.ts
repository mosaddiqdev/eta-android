import { useEffect, useState } from "react";

/** True for the first moments after a section mounts, so its rows can ease in once and not every time it is shown again. */
export function useIntro(ms = 900) {
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return intro;
}
