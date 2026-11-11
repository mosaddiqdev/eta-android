import { CircleHelp, Crown, FlaskConical, Landmark, PawPrint, ShieldHalf, Swords, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import type { CatalogKind } from "../../../game/catalog";
import { imageUrl } from "../../../game/images";
import { FadeImage } from "../../../ui/FadeImage";
import styles from "./ArtImage.module.css";

const FALLBACK = {
  building: Landmark,
  trap: Zap,
  troop: Swords,
  hero: Crown,
  pet: PawPrint,
  spell: FlaskConical,
  guardian: ShieldHalf,
  unknown: CircleHelp,
};

interface Props {
  imageKey: string | null;
  kind: CatalogKind | "unknown";
  size: number;
  /** Not finished yet, like a building that is still being built for the first time. */
  muted?: boolean;
}

/** A game picture that loads only when it is about to be seen, holds its place while it does, and has an icon when the repo has no art. */
export function ArtImage({ imageKey, kind, size, muted = false }: Props) {
  const url = imageUrl(imageKey);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  if (!url || failed) {
    const Icon = FALLBACK[kind];
    return (
      <span className={styles.fallback} style={{ width: size, height: size }}>
        <Icon size={size * 0.46} aria-hidden="true" />
      </span>
    );
  }
  return (
    <FadeImage
      src={url}
      size={size}
      width={size}
      height={size}
      imgClassName={muted ? styles.muted : undefined}
      radius="14px"
      // Not lazy: pictures inside a closed <details> (the Builder Base) never got their request started reliably.
      // Only the items of the imported village are ever shown, so there are few of them.
      loading="eager"
      decoding="async"
      onFail={onFail}
    />
  );
}
