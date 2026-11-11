import type { CSSProperties } from "react";
import styles from "./Bone.module.css";

/** How long a placeholder waits before it shows, so fast loads never flash one. Matches `--bone-wait` in Bone.module.css. */
export const BONE_WAIT_MS = 150;

interface Props {
  className?: string;
  style?: CSSProperties;
  /** A picture that failed keeps its block but stops shimmering. */
  still?: boolean;
}

/** Put on the root of a skeleton made of several bones. */
export const boneGroup = styles.group;

export function Bone({ className, style, still }: Props) {
  return (
    <span
      className={className ? `${styles.bone} ${className}` : styles.bone}
      style={style}
      data-still={still || undefined}
      aria-hidden="true"
    />
  );
}
