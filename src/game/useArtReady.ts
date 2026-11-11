import { useEffect, useState } from "react";
import { artUrl } from "./art";
import { isLoaded, preload } from "./preload";

/**
 * True once every named picture is fetched and decoded, so a screen can hold back until its art is there instead
 * of building itself around holes. Pictures already shown on this page count at once, so coming back to a screen
 * never waits. After `patience` it gives up and says yes: a slow network should delay a screen, not hide it.
 */
export function useArtReady(names: string[], patience = 3000): boolean {
  const [ready, setReady] = useState(() => names.every((name) => isLoaded(artUrl(name))));

  useEffect(() => {
    if (ready) return;
    let waiting = true;
    const arrive = () => waiting && setReady(true);
    const giveUp = setTimeout(arrive, patience);
    void Promise.all(names.map((name) => preload(artUrl(name), true))).then(arrive);
    return () => {
      waiting = false;
      clearTimeout(giveUp);
    };
  }, [ready, names, patience]);

  return ready;
}
