/**
 * Chuleta the hen's lines: how she joins the adventure and a cheer after
 * every finished quest. Her hints for each quest are in data/quests.ts.
 */

import { DialogueScript } from "../data/dialogues";

export const CHULETA_INTRO: DialogueScript = [
  { speaker: "Chuleta", portrait: "", text: "Und mich hast du wohl vergessen? Ich saß die ganze Zeit in deinem Rucksack!" },
  { speaker: "Tadeo", portrait: "", text: "Chuleta! Du bist ja mitgekommen! Bin ich froh!" },
];

/** Said when Tadeo walks round the thorn hedge: the arch is the only way into the Zauberwald. */
export const CHULETA_BEHIND_HEDGE = "Gack! Hier ist nur Wiese. In den Zauberwald kommst du nur durch das Tor!";

/** Cheer after finishing a milestone (keyed by the milestone just finished). */
export const CHULETA_CHEERS: Record<number, string> = {
  2: "Puh, war das heiß! Fast hätte ich ein gekochtes Ei gelegt!",
  3: "Ein Geist? Gack! Mir stehen jetzt schon die Federn zu Berge!",
  4: "Näher, als du denkst? Gack! Jetzt schaue ich mich dauernd um!",
  5: "Ein echtes Zauberschwert! Du bist ein richtiger Held!",
  6: "Mmmh, Zauberbeeren! Darf ich eine picken? Nein? Schade!",
  7: "Schwert, Beeren und Schlüssel! Drei Sachen hast du schon. Gack!",
  8: "Der Oger ist eigentlich ganz nett, oder?",
  9: "Alle vier Sachen sind gefunden! Ich bin ganz stolz auf dich. Gack!",
};
