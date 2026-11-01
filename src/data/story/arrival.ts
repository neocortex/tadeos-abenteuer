/**
 * Arrival and the volcano: the beach, the landing and Paco under the rock.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const ARRIVAL: Record<string, DialogueScript> = {
  // -----------------------------------------------------------------------
  // Milestone 1: Arrival
  // -----------------------------------------------------------------------
  intro_bottle: [
    line("Erzähler", "Eines Morgens findet Tadeo am Strand eine Flaschenpost."),
    line("Erzähler", "Darin ist eine alte Schatzkarte. Sie zeigt eine kleine Insel mit einem großen X."),
  ],
  intro_treasure: [
    line("Tadeo", "Ein Schatz! Den hole ich mir!"),
  ],
  intro_arrival: [
    line("Chuleta", "Gack! Der Hai hat unser Boot kaputt gemacht!"),
    line("Stimme", "Hilfe! Hilfe!"),
    line("Tadeo", "Das kommt vom Vulkan! Schnell!"),
    line("Chuleta", "Folge dem goldenen Stern! Gack!"),
  ],
  // -----------------------------------------------------------------------
  // Milestone 2: Volcano
  // -----------------------------------------------------------------------
  volcano_enter: [
    line("Tadeo", "Der Vulkan spuckt Feuer! Ich muss irgendwie an den Lavabrocken vorbei!"),
  ],
  // Paco under the rock is free. The empty hollow behind him is the game's mystery, so he brushes it aside.
  volcano_paco_thanks: [
    line("Käpt'n Paco", "Danke, Junge! Ich bin Käpt'n Paco."),
    line("Tadeo", "Was ist das für ein Stein?"),
    line("Käpt'n Paco", "Ach, alter Kram."),
  ],
  volcano_paco_boat: [
    line("Tadeo", "Mein Boot ist kaputt."),
    line("Käpt'n Paco", "Das flicke ich dir. Komm ins Dorf!"),
    line("Käpt'n Paco", "Nimm die Trittsteine. Auf der Brücke sitzt ein Oger."),
  ],
};
