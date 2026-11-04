/**
 * The cave and the magic forest.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const CAVE_FOREST: Record<string, DialogueScript> = {
  // -----------------------------------------------------------------------
  // Milestone 5: Cave
  // -----------------------------------------------------------------------
  cave_enter: [
    line("Erzähler", "Tief im Berg liegt die Höhle. Hier soll das Schwert sein."),
    line("Tadeo", "Eine dunkle Höhle! Zum Glück habe ich meine Fackel."),
    line("Tadeo", "Da vorne versperren Steine den Weg. Und da sitzt ein Maulwurf!"),
    line("Tadeo", "Vielleicht kann er mir helfen."),
  ],
  // Before he pulls the sword
  cave_sword_before: [
    line("Erzähler", "Ein Lichtstrahl fällt durch die Decke, genau auf den großen Kristall."),
    line("Tadeo", "Das Schwert! Es leuchtet blau."),
    line("Tadeo", "Wie lange es wohl schon hier steckt? Jetzt hole ich es raus!"),
  ],
  // With the sword held up
  cave_sword_after: [
    line("Tadeo", "Das Schwert aus dem Fels! Genau wie im Spruch vom Hüter."),
    line("Tadeo", "Damit komme ich durch die Dornen!"),
    line("Tadeo", "Jetzt fehlen noch drei Sachen. Als Nächstes die Beeren im Zauberwald!"),
  ],
  // -----------------------------------------------------------------------
  // Milestone 6: Forest
  // -----------------------------------------------------------------------
  // On the lake side of the arch, while the thorns still stand; the opening follows
  forest_hedge: [
    line("Tadeo", "Das ist das Tor zum Zauberwald. Nur hier kommt man hinein."),
    line("Tadeo", "Aber die Dornen versperren den Weg."),
    line("Chuleta", "Aua! Schon vom Hingucken piekst es. Gack!"),
    line("Tadeo", "Mal sehen, ob das Schwert wirklich hilft."),
  ],
  forest_hedge_open: [
    line("Chuleta", "Sie sind weg! Einfach so! Gack!"),
    line("Tadeo", "Das Tor ist frei! Auf in den Zauberwald!"),
  ],
  forest_enter: [
    line("Erzähler", "Hinter der Hecke beginnt der Zauberwald. Alles glitzert und leuchtet."),
    line("Tadeo", "Wow! Hier müssen die Zauberbeeren wachsen."),
    line("Tadeo", "Aber der Wald ist so groß. Wie soll ich sie nur finden?"),
  ],
  forest_complete: [
    line("Tadeo", "Zauberbeeren! Die machen böse Wesen wieder lieb."),
    line("Fuchs", "Nimm sie mit. Und bring das Herz zurück, damit der Wald weiter leuchtet."),
    line("Tadeo", "Das mache ich! Danke, Flocke."),
    line("Tadeo", "Der Hüter hat gesagt, der Schlüssel ist im Dorf. Ich frage dort nach!"),
  ],
  // Said over black after the third thorn bush, before the hunt starts over at the forest's edge (one of them)
  retry_forest_1: [line("Erzähler", "Aua, zu viele Dornen! Die Beeren hängen wieder an ihren Büschen.")],
  retry_forest_2: [line("Erzähler", "Die Dornen haben gepiekst. Flocke wartet am Waldrand. Versuch es noch mal!")],
  retry_forest_3: [line("Erzähler", "Kein Problem! Die Zauberbeeren wachsen nach. Diesmal läufst du um die Dornen herum.")],
};
