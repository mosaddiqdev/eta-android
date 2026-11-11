import { Castle, Telescope } from "lucide-react";
import { artUrl } from "../../../game/art";
import { imageUrl } from "../../../game/images";
import { FadeImage } from "../../../ui/FadeImage";
import type { Lane } from "../../../village/types";
import { laneKind } from "../format";
import styles from "./LaneIcon.module.css";

interface Props {
  lane: Lane;
  size?: number;
  /** A tinted square behind the icon, for headers. */
  tile?: boolean;
}

/**
 * Lane icons are our own signage, not the player's data: they always show the building at its newest
 * level, so a lane looks the same on every account and at every Town Hall. (The Town Hall crest is the
 * opposite on purpose: it is the player's own village, so it shows their level.)
 * The Builder Base lanes use the Builder Hall and the Star Laboratory from the game data.
 */
const BUILDER_BASE_ART = {
  bbBuilder: { key: "building-builderBase/builder_hall", Fallback: Castle },
  bbLab: { key: "building-builderBase/star_laboratory", Fallback: Telescope },
} as const;

/*
 * The three lane pictures in src/assets/lane are cut from the large building art: trimmed to the building,
 * scaled so it fills 84% of a square, and set so its visual centre (not its bounding box) sits on the middle.
 * So a tile can show the picture edge to edge and the three look the same size and weight, which the old
 * icons (one with empty margins at the sides, one filling its box) did not. The Builder Base pictures come
 * straight from the game and fill their whole box, so they are drawn at the same 84%.
 */
const LANE_FILL = 0.84;

export function LaneIcon({ lane, size = 24, tile = false }: Props) {
  const kind = laneKind(lane);
  const bb = lane === "bbBuilder" || lane === "bbLab" ? BUILDER_BASE_ART[lane] : null;
  const src = bb ? imageUrl(bb.key) : artUrl(`lane/${kind}`);
  // The lane pictures already carry their margin, so they fill the box. A bare icon is drawn a fifth larger than
  // the space it takes, so the building itself (not the margin) is the size you asked for.
  const inner = bb ? Math.round(size * (tile ? LANE_FILL : 1)) : tile ? size : Math.round(size * 1.2);

  return (
    <span
      className={tile ? styles.tile : styles.bare}
      data-kind={kind}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {bb && !src ? (
        <bb.Fallback size={inner * 0.8} strokeWidth={2} />
      ) : (
        <FadeImage src={src ?? ""} size={inner} width={inner} height={inner} radius="26%" />
      )}
    </span>
  );
}
