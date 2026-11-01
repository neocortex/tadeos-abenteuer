/**
 * The shark at sea and the treasure on the small island.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const SEA_TREASURE: Record<string, DialogueScript> = {
  // -----------------------------------------------------------------------
  // Quest 10: the shark
  // -----------------------------------------------------------------------
  // At the dock, right before the crossing
  sea_dock: [
    line("Käpt'n Paco", "Dein Boot ist geflickt! Der Oger hat es hergetragen."),
    line("Käpt'n Paco", "Folge den leuchtenden Seesternen. Da ist das Wasser sicher."),
  ],
  sea_crossing: [
    line("Tadeo", "Die kleine Schatzinsel liegt dort drüben! Ich muss mit dem Boot rüberfahren."),
    line("Erzähler", "Vorsicht — hohe Wellen! Weiche ihnen mit den Pfeiltasten aus!"),
  ],
  sea_shark: [
    line("Erzähler", "Plötzlich erscheint eine riesige Flosse im Wasser..."),
    line("Chuleta", "Der Hai ist auch ein Monster! Gack! Die Beeren!"),
    line("Tadeo", "Hier, Hai! Mach den Mund auf!"),
  ],
  shark_defeat: [
    line("Tadeo", "Der Hai ist wieder lieb! Jetzt kann ich sicher zur Schatzinsel fahren!"),
    line("Tadeo", "Das große X auf der Karte... Der Schatz muss dort vergraben sein!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 11: the small island. The chest holds more than gold.
  // -----------------------------------------------------------------------
  treasure_arrive: [
    line("Tadeo", "Die Schatzinsel! Hier muss der Schatz vergraben sein!"),
    line("Erzähler", "Ein großes X markiert die Stelle. Tadeo beginnt zu graben..."),
  ],
  treasure_dig: [
    line("Tadeo", "Eine Truhe! Aber sie steckt in Eis."),
    line("Chuleta", "Das ist Zaubereis! Das schmilzt nie."),
    line("Chuleta", "Nur der Hammer schafft es!"),
  ],
  treasure_hammer: [
    line("Erzähler", "Mit einem mächtigen Schlag zerschmettert Tadeo das Eis!"),
    line("Tadeo", "Jetzt noch der Goldene Schlüssel..."),
  ],
  // The chest gives up one thing after the other: each conversation below is a beat of its own
  treasure_note: [
    line("Tadeo", 'Ein Zettel. "Es tut mir leid. P."'),
    line("Chuleta", "P? Wie Pirat?"),
  ],
  // The first line is said before he touches the heart, the second with the heart in his hands
  treasure_heart: [
    line("Tadeo", "Das Herz! Ich habe ein bisschen Angst..."),
    line("Tadeo", "Oh. Es ist ganz warm!"),
  ],
  treasure_plan: [
    line("Tadeo", "Eine Papierrolle? Die schaue ich mir später an."),
  ],
  treasure_gold: [
    line("Tadeo", "DER SCHATZ! Gold, Edelsteine und... eine Krone!"),
  ],
  treasure_erupt: [
    line("Erzähler", "Da! Der Vulkan spuckt Feuer! Schnell zurück!"),
  ],
};
