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
    line("Tadeo", "Wie neu! Danke, Paco! Du bist ein echter Käpt'n."),
    line("Käpt'n Paco", "Hast du alles dabei? Der Hai schwimmt immer noch um die Insel."),
    line("Tadeo", "Ich weiß. Aber ich habe die Zauberbeeren!"),
    line("Käpt'n Paco", "Folge den leuchtenden Seesternen. Da ist das Wasser sicher."),
    line("Tadeo", "Woher weißt du das so genau?"),
    line("Käpt'n Paco", "Ach... Ein alter Käpt'n weiß so etwas. Gute Fahrt, Tadeo!"),
  ],
  sea_crossing: [
    line("Erzähler", "Zum zweiten Mal fährt Tadeo aufs Meer hinaus. Diesmal ist er bereit."),
    line("Tadeo", "Die kleine Schatzinsel liegt dort drüben! Ich muss mit dem Boot rüberfahren."),
    line("Chuleta", "Diesmal machen wir das Boot aber nicht kaputt! Gack!"),
    line("Erzähler", "Vorsicht — hohe Wellen! Weiche ihnen mit den Pfeiltasten aus!"),
  ],
  // A remark while sailing, when the boat leaves the channel
  sea_offcourse: [line("Chuleta", "Gack! Zu weit raus! Zurück zu den Seesternen!")],
  // The berries come out on Tadeo's second line
  sea_shark: [
    line("Erzähler", "Plötzlich erscheint eine riesige Flosse im Wasser..."),
    line("Tadeo", "Da ist er! Der Hai, der mein Boot kaputt gemacht hat!"),
    line("Chuleta", "Der Hai ist auch nur wütend! Gack! Die Beeren!"),
    line("Tadeo", "Hier, Hai! Mach den Mund auf!"),
  ],
  // Said at sea, after the shark has swum away
  shark_defeat: [
    line("Tadeo", "Der Hai ist wieder lieb! Jetzt kann ich sicher zur Schatzinsel fahren!"),
    line("Chuleta", "Er hat mit der Flosse gewinkt! Gack!"),
    line("Tadeo", "Er war nur so böse, weil das Herz fehlt. Armer Hai!"),
  ],
  // On the sand after the landing
  sea_landed: [
    line("Tadeo", "Geschafft! Endlich sind wir auf der Insel von der Karte!"),
    line("Chuleta", "Fester Boden! Gack! Nie wieder Boot!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 11: the small island. The chest holds more than gold.
  // -----------------------------------------------------------------------
  treasure_arrive: [
    line("Tadeo", "Die Schatzinsel! Hier muss der Schatz vergraben sein!"),
    line("Chuleta", "Und das Feuerherz! Vergiss das Herz nicht! Gack!"),
    line("Tadeo", "Ich schaue noch einmal auf die Karte."),
  ],
  treasure_dig_start: [
    line("Erzähler", "Ein großes X markiert die Stelle. Tadeo beginnt zu graben..."),
  ],
  treasure_dig: [
    line("Tadeo", "Eine Truhe! Aber sie steckt in Eis."),
    line("Chuleta", "Das ist Zauber-Eis! Das schmilzt nie."),
    line("Chuleta", "Nur der Hammer schafft es!"),
    line("Tadeo", "Der Hammer vom Berg zerschlägt das Eis. Genau wie im Spruch!"),
  ],
  treasure_hammer: [
    line("Erzähler", "Mit einem mächtigen Schlag zerschmettert Tadeo das Eis!"),
    line("Tadeo", "Jetzt noch der Goldene Schlüssel..."),
    line("Tadeo", "Hoffentlich passt er. Das ganze Dorf hat ihn so lange aufgehoben."),
  ],
  // The chest gives up one thing after the other: each conversation below is a beat of its own
  treasure_note: [
    line("Tadeo", 'Ein Zettel. "Es tut mir leid. P."'),
    line("Chuleta", "P? Wie Pirat?"),
    line("Tadeo", "Dem Piraten tut es leid? Das ist aber komisch."),
  ],
  // Said before he touches the heart
  treasure_heart_before: [
    line("Tadeo", "Das Herz! Ich habe ein bisschen Angst..."),
    line("Chuleta", "Der Hüter hat gesagt: Es verbrennt nur Diebe. Gack!"),
    line("Tadeo", "Ich bin kein Dieb. Ich bringe es nach Hause."),
  ],
  // Said with the heart in his hands
  treasure_heart_held: [
    line("Tadeo", "Oh. Es ist ganz warm!"),
    line("Erzähler", "Das Feuerherz klopft ganz leise. Wie ein echtes Herz."),
    line("Tadeo", "Keine Angst, Herz. Ich bringe dich heim."),
  ],
  treasure_plan: [
    line("Tadeo", "Eine Papierrolle? Da sind seltsame Linien drauf. Was ist das nur?"),
    line("Tadeo", "Keine Ahnung. Die nehme ich mit. Vielleicht weiß der Dorfälteste mehr."),
  ],
  treasure_gold: [
    line("Tadeo", "DER SCHATZ! Gold, Edelsteine und... eine Krone!"),
  ],
  // After the crown has landed on his head, before the ground shakes
  treasure_crown: [
    line("Chuleta", "Gack! Du siehst aus wie ein König!"),
    line("Tadeo", "Ich habe es geschafft! Das Herz und den Schatz!"),
  ],
  treasure_erupt: [
    line("Erzähler", "Da! Der Vulkan spuckt Feuer! Schnell zurück!"),
    line("Tadeo", "Oh nein! Das Dorf! Alle sind in Gefahr!"),
    line("Chuleta", "Das Herz muss zurück auf den Stein! Schnell, zum Boot! Gack!"),
  ],
};
