import type { CSSProperties } from "react";
import { formatAge } from "../../../engine/time";
import { artUrl } from "../../../game/art";
import { FadeImage } from "../../../ui/FadeImage";
import type { Lane } from "../../../village/types";
import { LANE_ONE } from "../format";
import styles from "./IdleSlot.module.css";
import { LaneIcon } from "./LaneIcon";

/**
 * What kind of thing is idle decides how it shows it. Only a person sleeps; a pet waits, and a machine goes on standby.
 * The card itself (dashed amber border, amber title, timer on the right) is the same for all of them, so amber and
 * dashed always means "free". Only the small glyph at the corner of the picture changes.
 */
export type IdleKind = "person" | "creature" | "machine";

interface IdleCopy {
  kind: IdleKind;
  title: string;
  hint: string;
  /** A worker's face to show instead of the lane building, for the lanes that have one. */
  face?: string;
}

const IDLE: Record<Lane, IdleCopy> = {
  builder: {
    kind: "person",
    title: `Idle ${LANE_ONE.builder}`,
    hint: "Start something so it isn’t wasted",
    face: "helpers/builders_apprentice",
  },
  lab: { kind: "machine", title: "Laboratory is free", hint: "Start a research" },
  pet: { kind: "creature", title: "Pet slot open", hint: "Upgrade a pet" },
  bbBuilder: {
    kind: "machine",
    title: `Idle ${LANE_ONE.bbBuilder}`,
    hint: "Start something so it isn’t wasted",
  },
  bbLab: { kind: "machine", title: "Star Laboratory is free", hint: "Start a research" },
};

/** Exported so the lane list and the tests can ask what a lane does when idle. */
export const idleKindOf = (lane: Lane): IdleKind => IDLE[lane].kind;

function Glyph({ kind }: { kind: IdleKind }) {
  if (kind === "person") {
    return (
      <span className={styles.zs}>
        <span>Z</span>
        <span>Z</span>
        <span>Z</span>
      </span>
    );
  }
  if (kind === "creature") {
    return (
      <svg
        className={styles.paw}
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor"
        aria-hidden="true"
      >
        <ellipse cx="12" cy="16.5" rx="5" ry="4" />
        <ellipse cx="5.2" cy="11" rx="2.2" ry="2.9" transform="rotate(-18 5.2 11)" />
        <ellipse cx="9.4" cy="6.4" rx="2.1" ry="2.9" />
        <ellipse cx="14.6" cy="6.4" rx="2.1" ry="2.9" />
        <ellipse cx="18.8" cy="11" rx="2.2" ry="2.9" transform="rotate(18 18.8 11)" />
      </svg>
    );
  }
  return <span className={styles.led} />;
}

interface Props {
  lane: Lane;
  /** Position in the lane, so a column of idle slots does not move in step. */
  index: number;
  /** Seconds since this slot went idle, when that is known. */
  idleFor: number | null;
}

export function IdleSlot({ lane, index, idleFor }: Props) {
  const { kind, title, hint, face } = IDLE[lane];
  return (
    <div className={styles.idle} data-kind={kind} style={{ "--i": index } as CSSProperties}>
      <span className={styles.figure} aria-hidden="true">
        <span className={styles.avatar}>
          {face ? (
            <FadeImage src={artUrl(face)} size={44} width={44} height={44} radius="14px" />
          ) : (
            <LaneIcon lane={lane} size={44} tile />
          )}
        </span>
        <Glyph kind={kind} />
      </span>
      <span className={styles.text}>
        <span className={styles.head}>
          <strong>{title}</strong>
          {idleFor != null && (
            <span className={styles.since}>
              <span className="sr-only">Idle for </span>
              {formatAge(Math.max(0, idleFor))}
            </span>
          )}
        </span>
        <span className={styles.hint}>{hint}</span>
      </span>
    </div>
  );
}
