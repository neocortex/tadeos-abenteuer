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
    line("Erzähler", "Da ist er! Der Oger ist noch größer, als Tadeo gedacht hat."),
    line("Tadeo", "Ich brauche deine Hilfe!"),
    line("Oger", "GRRR! Das ist MEINE Brücke! Keiner kommt hier rüber!"),
    line("Tadeo", "Ich will gar nicht rüber. Ich habe eine Zauberbeere für dich!"),
    line("Oger", "HA! Erst musst du an mir vorbei!"),
    line("Tadeo", "So ist er zu wütend für eine Beere. Erst muss ich ihn müde machen."),
  ],
  // The first line is said before the berry, the rest after the ogre has eaten it
  ogre_defeat: [
    line("Oger", "Ugh... Du bist stärker, als du aussiehst."),
    line("Oger", "Oh... Ich war gar nicht immer so böse."),
    line("Oger", "Seit vielen Jahren bin ich nur noch wütend. Ich wusste nie, warum."),
    line("Tadeo", "Das kommt vom Feuerherz. Ein Pirat hat es gestohlen. Ich bringe es zurück."),
    line("Oger", "Du bist mein Freund, Tadeo. Wie kann ich dir helfen?"),
    line("Tadeo", "Komm mit zum Berg! Da liegt etwas sehr Schweres im Weg."),
  ],
  // At the foot of the boulder, back on the island
  ogre_boulder: [
    line("Tadeo", "Das ist der Riesenfels! Kannst du ihn wegheben?"),
    line("Oger", "Der Fels? Den hebe ich dir mit einer Hand!"),
  ],
  ogre_boulder_done: [
    line("Chuleta", "Wow! Mit einer Hand! Gack!"),
    line("Tadeo", "Danke, Oger! Jetzt ist der Weg zum Hammer frei."),
    line("Tadeo", "Dann brauche ich nur noch mein Boot. Paco flickt es gerade."),
    line("Oger", "Das Boot? Das trage ich dir zum Steg. Das ist ganz leicht!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 7: the village. The elder says where the key came from; the trials follow.
  // -----------------------------------------------------------------------
  village_enter: [
    line("Tadeo", "Ich bin wieder da! Das Schwert und die Zauberbeeren habe ich schon."),
    line("Dorfältester", "Das ist ja wunderbar, Tadeo! Was fehlt dir noch?"),
    line("Tadeo", "Der Hüter sagt, der Schlüssel ist hier im Dorf. Hast du ihn?"),
    line("Dorfältester", "Der alte Schlüssel? Der lag eines Morgens vor meiner Tür."),
    line("Dorfältester", "Mit einem Zettel: Nur für jemanden, der klug ist. Darum gibt es die Prüfungen."),
    line("Tadeo", "Wer hat ihn dir denn gebracht?"),
    line("Dorfältester", "Das weiß niemand. Und wofür er ist, wussten wir auch nie."),
    line("Käpt'n Paco", "Hm, hm."),
    line("Dorfältester", "Jetzt wissen wir es. Komm mit zum Feuerkreis, Tadeo!"),
  ],
  // Back on the island, the key in his hand: Tadeo brings up the hammer, because he heard of it from the Hüter
  village_after: [
    line("Dorfältester", "Du hast ihn dir verdient!"),
    line("Tadeo", "Jetzt fehlt nur noch der Hammer. Der liegt oben auf dem Berg."),
    line("Dorfältester", "Auf dem Berg? Aber ein Riesenfels versperrt den Weg."),
    line("Dorfältester", "Nur der Oger ist stark genug, ihn wegzuheben."),
    line("Tadeo", "Der Oger? Der lässt doch niemanden vorbei!"),
    line("Chuleta", "Der ist doch nur wütend! Gack! Die Beeren!"),
    line("Tadeo", "Genau! Die Beeren machen ihn wieder lieb. Komm, wir gehen zur Brücke!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 9: the mountain
  // -----------------------------------------------------------------------
  mountain_enter: [
    line("Erzähler", "Der Berg ist so hoch, dass ganz oben Schnee liegt."),
    line("Chuleta", "Ein alter Schrein! Den hat das alte Volk gebaut."),
    line("Tadeo", "Dort oben liegt der goldene Hammer!"),
    line("Tadeo", "Der Weg ist ganz schön alt. Hoffentlich hält er noch."),
    line("Chuleta", "Und pass auf die rollenden Steine auf! Gack!"),
  ],
  mountain_complete: [
    line("Tadeo", "Der goldene Hammer! Der Hammer vom Berg zerschlägt das Eis."),
    line("Tadeo", "Jetzt habe ich alle vier Sachen: Schwert, Beeren, Schlüssel und Hammer!"),
    line("Erzähler", "Von hier oben sieht Tadeo die ganze Insel. Und weit draußen im Meer..."),
    line("Chuleta", "Schau, die kleine Insel! Und da ist die Flosse..."),
    line("Tadeo", "Der Hai schwimmt um die Insel. Da muss ich vorbei!"),
    line("Tadeo", "Jetzt brauche ich mein Boot. Schnell zum Steg im Norden!"),
  ],
};
