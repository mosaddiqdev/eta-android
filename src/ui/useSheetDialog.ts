import { useCallback, useEffect, useRef, useState } from "react";

/** Same length as --leave-ms in styles/sheet.css. */
const LEAVE_MS = 180;

/**
 * Opens and closes a modal <dialog> so it leaves the way it came: a sheet slides back down, a card fades out.
 * A bare dialog.close() removes the dialog in the same frame, with no chance to play an exit.
 *
 * Every way out goes through `close`: the close button, the backdrop, Escape and a parent turning `open` off. It marks
 * the dialog `data-leaving` (styles/sheet.css animates that), then really closes it once the exit has played.
 */
export function useSheetDialog(open: boolean, onOpen?: (dialog: HTMLDialogElement) => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef(0);
  // The body stays mounted for the length of the exit, so a sheet that is still sliding away is not emptied first.
  const [kept, setKept] = useState(false);
  const opened = useRef(onOpen);
  opened.current = onOpen;

  const close = useCallback(() => {
    const el = ref.current;
    if (!el?.open || timer.current) return;
    const done = () => {
      timer.current = 0;
      el.removeAttribute("data-leaving");
      el.close();
      setKept(false);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
    el.setAttribute("data-leaving", "");
    timer.current = window.setTimeout(done, LEAVE_MS);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!open) return close();
    // Opened again before the exit finished: the sheet is still on screen, so let it stay.
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = 0;
      el.removeAttribute("data-leaving");
    }
    setKept(true);
    if (!el.open) {
      el.showModal();
      opened.current?.(el);
    }
  }, [open, close]);

  return {
    /** Spread onto the <dialog>: the ref, the marker the exit styles hang on, and Escape. */
    props: {
      ref,
      "data-sheet": "",
      onCancel: (event: { preventDefault: () => void }) => {
        event.preventDefault();
        close();
      },
    },
    /** True while the body should be rendered: open, or still playing its exit. */
    mounted: open || kept,
    close,
  };
}
