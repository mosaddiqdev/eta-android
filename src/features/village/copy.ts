/**
 * What the import flow says when something goes wrong. One place, so the empty screen, the paste box and a
 * village that is already open all speak the same way: say what happened, then what to do next.
 * Messages about the export's contents live in village/parse.ts, which shares COPY_STEPS with this file.
 */

import { COPY_STEPS } from "../../village/constants";

export const COPY = {
  /** Reasons the paste box opens by itself. They sit above the text box, so "here" is the box. */
  clipboardBlocked: "Your browser didn’t let us read the clipboard. Paste your village data here instead.",
  clipboardUnsupported: "This browser can’t paste from a button. Paste your village data here instead.",
  clipboardEmpty: `Nothing to paste yet. Copy your village in the game first (${COPY_STEPS}), then try again.`,
  /** Shown as a toast, so it has to read in one breath. */
  sameVillage: "That’s the village already open. Copy your other village in the game, then try again.",
  unreadable: "We couldn’t read that data. Copy your village again and try once more.",
  savedUnreadable: "A saved village couldn’t be opened, so it was removed. Import it again to bring it back.",
} as const;
