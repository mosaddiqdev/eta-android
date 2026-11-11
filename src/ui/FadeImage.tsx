import {
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { isLoaded, markLoaded } from "../game/preload";
import { BONE_WAIT_MS, Bone } from "./Bone";
import styles from "./FadeImage.module.css";

/*
 * loading: on its way, placeholder showing (after its short wait).
 * fresh:   arrived after the placeholder showed, so the placeholder fades out as the picture fades in.
 * quick:   arrived before the placeholder was due, so the picture just fades in.
 * ready:   already decoded earlier on this page, shown at once.
 */
type State = "loading" | "fresh" | "quick" | "ready" | "failed";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "className" | "src" | "onError"> {
  src: string;
  /** Sizes the box, so the placeholder and the picture take the same room. */
  frameClassName?: string;
  imgClassName?: string;
  /** A square box in pixels, for pictures that are always drawn at one size. Otherwise the frame class sizes it. */
  size?: number;
  /** Corner radius of the placeholder, as CSS: `50%` for a round picture. */
  radius?: string;
  onFail?: () => void;
  /** Drawn on top of the picture inside the same box. */
  children?: ReactNode;
}

/** A picture that shows a quiet placeholder while it loads and fades in when it arrives. Never flashes twice. */
export function FadeImage({ src, ...rest }: Props) {
  // Keyed by address, so a new picture in the same place starts from its own state.
  return <Picture key={src} src={src} {...rest} />;
}

function Picture({
  src,
  frameClassName,
  imgClassName,
  size,
  radius,
  onFail,
  children,
  alt = "",
  ...img
}: Props) {
  const [state, setState] = useState<State>(isLoaded(src) ? "ready" : "loading");
  const since = useRef(performance.now());
  const el = useRef<HTMLImageElement>(null);

  // The picture can finish (or fail) before React attaches onLoad/onError, for instance when it is cached, or when it
  // sits in a closed <details> that is opened later. Without this check it would stay invisible behind its placeholder.
  useEffect(() => {
    const image = el.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) {
      markLoaded(src);
      setState((now) => (now === "loading" ? "quick" : now));
    } else {
      setState("failed");
      onFail?.();
    }
  }, [src, onFail]);

  return (
    <span
      className={frameClassName ? `${styles.frame} ${frameClassName}` : styles.frame}
      data-state={state}
      style={{ width: size, height: size, "--radius": radius } as CSSProperties}
    >
      <Bone className={styles.bone} still={state === "failed"} />
      <img
        {...img}
        ref={el}
        className={imgClassName}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => {
          markLoaded(src);
          setState((now) =>
            now === "ready" ? now : performance.now() - since.current > BONE_WAIT_MS ? "fresh" : "quick",
          );
        }}
        onError={() => {
          setState("failed");
          onFail?.();
        }}
      />
      {children}
    </span>
  );
}
