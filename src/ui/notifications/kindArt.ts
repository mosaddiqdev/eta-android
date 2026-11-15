import type { KindId } from "../../notifications/kinds";

/** The game picture that stands for each kind in the list. Newest-level pictures, since none of these is about a level. */
export const KIND_ART: Record<KindId, string> = {
  builder: "building-home/builder's_hut",
  lab: "building-home/laboratory",
  pet: "building-home/pet_house",
  builderBase: "building-builderBase/builder_hall",
  helperBuilder: "helper/builder's_apprentice",
  helperLab: "helper/lab_assistant",
  tower: "building-builderBase/clock_tower",
};
