import { countdown } from "../format";
import { useNow } from "../useNow";

/** The only thing that re-renders every second. */
export function Countdown({ at }: { at: number }) {
  return <span>{countdown(at, useNow())}</span>;
}
