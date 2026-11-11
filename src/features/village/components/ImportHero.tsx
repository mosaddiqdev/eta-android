import { useState } from "react";
import { artUrl } from "../../../game/art";
import { isLoaded, markLoaded } from "../../../game/preload";
import styles from "./ImportHero.module.css";

// Cut from the game's full-size art by scripts/build-hero-art.mjs: about 3x the size they are drawn at.
const PIECES = [
  { name: "lab", width: 440, height: 383 },
  { name: "builder", width: 540, height: 664 },
  { name: "pet", width: 400, height: 430 },
] as const;

/** The pictures the import screen waits for before it shows itself. */
export const HERO_ART = PIECES.map(({ name }) => `hero/${name}`);

/**
 * The three lanes as one small group: the Builder's Hut in front, the Laboratory and Pet House behind it
 * on either side. No glow and no plate; depth is placement, overlap and a soft contact shadow.
 * The arrival (the hut first, then the other two) waits until all three pictures are decoded, so it never plays on half-loaded art. A picture the
 * page has already shown (the empty screen opened again after "forget") counts as ready at once.
 */
export function ImportHero() {
  const [ready, setReady] = useState<Set<string>>(
    () => new Set(PIECES.map(({ name }) => name).filter((name) => isLoaded(artUrl(`hero/${name}`)))),
  );
  const settle = (name: string) => {
    markLoaded(artUrl(`hero/${name}`));
    setReady((now) => new Set(now).add(name));
  };

  return (
    <div className={styles.stage} data-ready={ready.size === PIECES.length || undefined} aria-hidden="true">
      {PIECES.map(({ name, width, height }) => (
        <div key={name} className={`${styles.piece} ${styles[name]}`}>
          <img
            src={artUrl(`hero/${name}`)}
            alt=""
            width={width}
            height={height}
            decoding="async"
            fetchPriority="high"
            draggable={false}
            onLoad={() => settle(name)}
            onError={() => settle(name)}
          />
        </div>
      ))}
    </div>
  );
}
