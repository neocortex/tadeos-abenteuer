/**
 * The village, the ogre and the mountain.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const VILLAGE_OGRE_MOUNTAIN: Record<string, DialogueScript> = {
  // -----------------------------------------------------------------------
  // Quest 8: the ogre. The fight is told in challenges/ogre/story.ts; on the island he lifts the boulder.
  // -----------------------------------------------------------------------
  ogre_enter: [
    line("Tadeo", "Ich brauche deine Hilfe!"),
    line("Oger", "HA! Erst musst du an mir vorbei!"),
  ],
  // The first line is said before the berry, the rest after the ogre has eaten it
  ogre_defeat: [
    line("Oger", "Ugh... Du bist stärker, als du aussiehst."),
    line("Oger", "Oh... Ich war gar nicht immer so böse."),
  ],
  // At the foot of the boulder, back on the island
  ogre_boulder: [
    line("Tadeo", "Das ist der Riesenfels! Kannst du ihn wegheben?"),
    line("Oger", "Der Fels? Den hebe ich dir mit einer Hand!"),
  ],
  ogre_boulder_done: [
    line("Chuleta", "Wow! Mit einer Hand! Gack!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 7: the village. The elder says where the key came from; the trials follow.
  // -----------------------------------------------------------------------
  village_enter: [
    line("Tadeo", "Hast du den Schlüssel für die Truhe?"),
    line("Dorfältester", "Der alte Schlüssel? Der lag eines Morgens vor meiner Tür."),
    line("Dorfältester", "Mit einem Zettel: Nur für jemanden, der klug ist. Darum gibt es die Prüfungen."),
  ],
  // Back on the island, the key in his hand: where the hammer is, and what stands in the way
  village_after: [
    line("Dorfältester", "Du hast ihn dir verdient! Jetzt fehlt noch der Hammer."),
    line("Dorfältester", "Er liegt oben auf dem Berg."),
    line("Dorfältester", "Aber ein Riesenfels versperrt den Weg. Nur der Oger ist stark genug."),
    line("Chuleta", "Ein Monster? Gack! Die Beeren!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 9: the mountain
  // -----------------------------------------------------------------------
  mountain_enter: [
    line("Chuleta", "Ein alter Schrein! Den hat das alte Volk gebaut."),
    line("Tadeo", "Dort oben liegt der goldene Hammer!"),
  ],
  mountain_complete: [
    line("Tadeo", "Der goldene Hammer! Er ist für das Eis, hier oben im Schnee!"),
    line("Chuleta", "Schau, die kleine Insel! Und da ist die Flosse..."),
  ],
};
