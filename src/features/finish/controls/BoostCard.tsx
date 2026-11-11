import { Minus, Plus } from "lucide-react";
import { useRef } from "react";
import { type BoostItem, speedOf } from "../../../engine/items";
import { artUrl } from "../../../game/art";
import { FadeImage } from "../../../ui/FadeImage";
import { tick } from "../../../ui/haptics";
import styles from "./BoostCard.module.css";

const MAX = 99;

interface Props {
  item: BoostItem;
  count: number;
  onChange: (count: number) => void;
}

export function BoostCard({ item, count, onChange }: Props) {
  const number = useRef<HTMLOutputElement>(null);

  // A tap nudges the number so a change reads even with a thumb covering it. Not on first paint, and not for reduced motion.
  function change(next: number) {
    onChange(next);
    tick();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    number.current?.animate([{}, { transform: "scale(1.18)" }, {}], {
      duration: 180,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    });
  }

  return (
    <article className={styles.card} data-active={count > 0}>
      <button
        type="button"
        className={styles.art}
        aria-label={`Use ${item.label}`}
        tabIndex={-1}
        onClick={() => count === 0 && change(1)}
      >
        <FadeImage src={artUrl(`items/${item.art}`)} frameClassName={styles.frame} radius="50%" />
      </button>
      <h3 className={styles.name}>{item.label}</h3>
      <p className={styles.meta}>
        <span className={styles.speed}>{speedOf(item)}x</span> for 1h each
      </p>
      <div className={styles.counter}>
        <button
          type="button"
          className={styles.step}
          aria-label={`Fewer ${item.label}`}
          disabled={count <= 0}
          onClick={() => change(count - 1)}
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <output ref={number} className={styles.count} aria-label={`${item.label} used`}>
          {count}
        </output>
        <button
          type="button"
          className={styles.step}
          aria-label={`More ${item.label}`}
          disabled={count >= MAX}
          onClick={() => change(count + 1)}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
