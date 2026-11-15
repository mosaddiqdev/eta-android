import type { PlanEvent } from "../village/plan";

/** What a notification sounds like. "system" is the phone's own notification sound; "clash" is the game's own sound for what finished. */
export type Sound = "system" | "clash" | "silent";
export const SOUNDS: readonly Sound[] = ["system", "clash", "silent"];

/** Which of the game's own upgrade sounds "clash" plays: a finished building, a hero, or research. */
export type Cue = "building" | "hero" | "lab";

export type KindId = "builder" | "lab" | "pet" | "builderBase" | "helperBuilder" | "helperLab" | "tower";

export interface Kind {
  id: KindId;
  title: string;
  /** What it tells you, in the words the settings list shows under the title. */
  hint: string;
}

export interface KindGroup {
  title: string;
  kinds: Kind[];
}

/** The things a player can switch on or off one by one, in the order the settings list shows them. */
export const KIND_GROUPS: KindGroup[] = [
  {
    title: "Upgrades finished",
    kinds: [
      { id: "builder", title: "Builders", hint: "A building, trap or hero is done" },
      { id: "lab", title: "Laboratory", hint: "Research is done" },
      { id: "pet", title: "Pet House", hint: "A pet has levelled up" },
      { id: "builderBase", title: "Builder Base", hint: "The Master Builder or Star Laboratory is done" },
    ],
  },
  {
    title: "Helpers",
    kinds: [
      { id: "helperBuilder", title: "Builder's Apprentice", hint: "Free, and what it would speed up most" },
      { id: "helperLab", title: "Lab Assistant", hint: "Free, and what it would speed up most" },
    ],
  },
  { title: "Clock Tower", kinds: [{ id: "tower", title: "Clock Tower", hint: "Ready to use again" }] },
];

export const KINDS: Kind[] = KIND_GROUPS.flatMap((group) => group.kinds);
export const KIND_IDS: readonly KindId[] = KINDS.map((kind) => kind.id);

const FINISHED: Record<string, KindId> = {
  builder: "builder",
  lab: "lab",
  pet: "pet",
  bbBuilder: "builderBase",
  bbLab: "builderBase",
};

/** Which switch an event answers to. Null for the events no notification is sent for (a potion running out). */
export function kindOf(event: Pick<PlanEvent, "kind" | "lane">): KindId | null {
  if (event.kind === "finish") return FINISHED[event.lane] ?? null;
  if (event.kind === "towerReady") return "tower";
  if (event.kind === "helperReady") return event.lane === "lab" ? "helperLab" : "helperBuilder";
  return null;
}
