import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { Collapse } from "./Collapse";
import styles from "./Disclosure.module.css";

interface Props {
  /** What the button says. The chevron is added after it. */
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  /** Set both to control it from outside, for instance to open it when something inside is linked to. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A show and hide section: the animated replacement for <details>, which can only snap open. The button is the first
 * child of the root, so a stylesheet can reach it as `.root > button`.
 */
export function Disclosure({
  trigger,
  children,
  className,
  defaultOpen = false,
  open: given,
  onOpenChange,
}: Props) {
  const [own, setOwn] = useState(defaultOpen);
  const open = given ?? own;
  const setOpen = (next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  };
  const id = useId();

  return (
    <div className={className}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {trigger}
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </button>
      <Collapse id={id} open={open}>
        {children}
      </Collapse>
    </div>
  );
}
