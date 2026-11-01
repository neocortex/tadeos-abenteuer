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
    line("Tadeo", "Eine dunkle Höhle! Zum Glück habe ich meine Fackel."),
    line("Tadeo", "Da vorne versperren Steine den Weg. Und da sitzt ein Maulwurf!"),
  ],
  cave_sword: [
    line("Tadeo", "Das Schwert! Es leuchtet blau."),
    line("Tadeo", "Damit komme ich durch die Dornen!"),
  ],
  // -----------------------------------------------------------------------
  // Milestone 6: Forest
  // -----------------------------------------------------------------------
  forest_enter: [
    line("Tadeo", "Der Zauberwald! Hier sollen magische Beeren wachsen. Aber Vorsicht vor den Dornen!"),
  ],
  forest_complete: [
    line("Tadeo", "Zauberbeeren! Die machen böse Monster wieder lieb."),
    line("Tadeo", "Jetzt zurück ins Dorf! Dort wartet der Schlüssel."),
  ],
};
