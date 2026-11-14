import { useEffect, useState } from "react";

// Fields a keyboard types into. Radios and checkboxes take taps, not typing.
const TYPED =
  "input:not([type=radio], [type=checkbox], [type=range], [type=button], [type=submit], [type=reset]), textarea";

/**
 * True while a text field has focus, which on a phone means the keyboard is up. The result sheet uses it to shrink to
 * its summary line, so it doesn't sit over the boxes being typed in. Moving from one box to the next is not leaving:
 * the focus-out waits a moment to see whether another field takes over.
 */
export function useTyping() {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let timer = 0;
    const focusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches(TYPED)) return;
      window.clearTimeout(timer);
      setTyping(true);
    };
    const focusOut = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setTyping(false), 150);
    };
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
    };
  }, []);

  return typing;
}
