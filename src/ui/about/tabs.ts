export type AboutTab = "story" | "how" | "credits";

export interface Section {
  id: string;
  title: string;
}

export const TABS: { id: AboutTab; label: string; sections: Section[] }[] = [
  {
    id: "story",
    label: "Story",
    sections: [
      { id: "why", title: "Why I made it" },
      { id: "grew", title: "How it grew" },
    ],
  },
  {
    id: "how",
    label: "How it works",
    sections: [
      { id: "finish", title: "Finish time" },
      { id: "boosts", title: "Boosts" },
      { id: "example", title: "An example" },
      { id: "village", title: "My village" },
      { id: "limits", title: "Where it can be wrong" },
    ],
  },
  {
    id: "credits",
    label: "Credits",
    sections: [
      { id: "supercell", title: "Supercell" },
      { id: "data", title: "Game data" },
      { id: "built", title: "Built with" },
    ],
  },
];
