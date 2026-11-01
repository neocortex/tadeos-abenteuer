/**
 * All dialogue scripts in German.
 * Keys correspond to trigger points in the game. The story's scripts live in data/story/, one file per part.
 */

import { ARRIVAL } from "./story/arrival";
import { LEGEND } from "./story/legend";
import { CAVE_FOREST } from "./story/caveForest";
import { VILLAGE_OGRE_MOUNTAIN } from "./story/villageOgreMountain";
import { SEA_TREASURE } from "./story/seaTreasure";
import { FINALE } from "./story/finale";

export interface DialogueLine {
  speaker: string;
  portrait: string;
  text: string;
  /** Read aloud instead of `text` when the text has a changing value that has no recording. */
  spoken?: string;
}

export type DialogueScript = DialogueLine[];

export const DIALOGUES: Record<string, DialogueScript> = {
  ...ARRIVAL,
  ...LEGEND,
  ...CAVE_FOREST,
  ...VILLAGE_OGRE_MOUNTAIN,
  ...SEA_TREASURE,
  ...FINALE,
  // Quest 7: the village trials; the elder's talk around them is in data/story/villageOgreMountain.ts
  village_simon1_intro: [
    {
      speaker: "Weise Frau",
      portrait: "portrait_npc1",
      text: "Ich zeige dir ein Muster aus drei Schritten. Schau genau hin und wiederhole es mit den Pfeiltasten!",
    },
  ],
  village_simon1_success: [
    {
      speaker: "Weise Frau",
      portrait: "portrait_npc1",
      text: "Sehr gut! Du hast ein gutes Gedächtnis, junger Held!",
    },
  ],
  village_simon1_fail: [
    {
      speaker: "Weise Frau",
      portrait: "portrait_npc1",
      text: "Das war leider falsch! Schau nochmal genau hin...",
    },
  ],
  village_simon2_intro: [
    {
      speaker: "Weiser Mann",
      portrait: "portrait_npc2",
      text: "Meine Aufgabe ist schwieriger -- vier Schritte! Merk dir die Reihenfolge gut!",
    },
  ],
  village_simon2_success: [
    {
      speaker: "Weiser Mann",
      portrait: "portrait_npc2",
      text: "Ausgezeichnet! Du bist wirklich aufmerksam!",
    },
  ],
  village_simon2_fail: [
    {
      speaker: "Weiser Mann",
      portrait: "portrait_npc2",
      text: "Leider daneben! Versuch es nochmal. Pass gut auf!",
    },
  ],
  village_simon3_intro: [
    {
      speaker: "Dorfältester",
      portrait: "portrait_npc0",
      text: "Die letzte Prüfung! Löse die Rechenaufgabe, um den Schlüssel zu erhalten!",
    },
  ],
  village_simon3_success: [
    {
      speaker: "Dorfältester",
      portrait: "portrait_npc0",
      text: "Wunderbar! Du hast alle drei Prüfungen bestanden! Hier ist der Goldene Schlüssel!",
    },
  ],
  village_simon3_fail: [
    {
      speaker: "Dorfältester",
      portrait: "portrait_npc0",
      text: "Das war leider falsch! Versuche es noch einmal mit einer neuen Aufgabe.",
    },
  ],
};
