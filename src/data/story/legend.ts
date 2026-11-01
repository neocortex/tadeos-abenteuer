/**
 * The legend: the elder's story and the ghost at the lake.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const LEGEND: Record<string, DialogueScript> = {
  // -----------------------------------------------------------------------
  // Quest 3: the elder tells the legend; the map shows where the heart is
  // -----------------------------------------------------------------------
  elder_legend: [
    line("Dorfältester", "Du hast Paco gerettet. Danke, Tadeo!"),
    line("Dorfältester", "Unser Vulkan hat ein Herz: das Feuerherz."),
    line("Dorfältester", "Solange es auf dem alten Stein liegt, schläft der Vulkan."),
    line("Dorfältester", "Aber ein Pirat hat es gestohlen. Jetzt wacht der Vulkan auf!"),
    line("Dorfältester", "Und niemand weiß, wo das Herz ist."),
    // Tadeo's line ends the script; the map card follows it
    line("Tadeo", "Moment! Ich habe eine Karte!"),
  ],
  elder_after_map: [
    line("Dorfältester", "Das X! Dort muss es sein!"),
    line("Käpt'n Paco", "Hm, hm."),
    line("Dorfältester", "Wie du hinkommst, weiß nur der Geist am See."),
  ],
  // -----------------------------------------------------------------------
  // Quest 4: three riddles wake the ghost at the lake (the riddles are in game/lake.ts)
  // -----------------------------------------------------------------------
  lake_wrong: [
    line("Steintafel", "Hm, das passt noch nicht. Versuch es noch einmal!"),
  ],
  lake_hueter: [
    line("Hüter", "Ich bin der Hüter. Ich habe auf das Herz aufgepasst."),
    line("Hüter", "Aber ich bin ein Geist. Ich habe keine Hände."),
    line("Hüter", "Du hast Hände, Tadeo. Bring das Herz zurück!"),
  ],
  // The four rhyming lines, then Tadeo's plain version of them
  lake_rhyme: [
    line("Hüter", "Das Schwert aus dem Fels zerschneidet den Dorn,"),
    line("Hüter", "die Beere im Wald nimmt den Monstern den Zorn."),
    line("Hüter", "Der Hammer vom Berg zerschlägt das Eis,"),
    line("Hüter", "der Schlüssel vom Dorf für das Herz, so heiß."),
    line("Tadeo", "Also: Das Schwert für die Dornen. Die Beeren für die Monster."),
    line("Tadeo", "Der Hammer für das Eis. Der Schlüssel für die Truhe!"),
  ],
  lake_after_rhyme: [
    line("Hüter", "Keine Angst vor dem Herz. Es verbrennt nur Diebe."),
    line("Hüter", "Und der Pirat... Er ist näher, als du denkst."),
  ],
};
