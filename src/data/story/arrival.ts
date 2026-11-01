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
    line("Erzähler", "Das ist Tadeo. Er wohnt direkt am Meer."),
    line("Erzähler", "Jeden Morgen sucht er am Strand nach Muscheln und anderen Schätzen."),
    line("Erzähler", "Eines Morgens findet er etwas ganz Besonderes: eine Flaschenpost!"),
    line("Tadeo", "Nanu? Da ist ja etwas drin!"),
    line("Erzähler", "Darin ist eine alte Schatzkarte. Sie zeigt eine kleine Insel mit einem großen X."),
  ],
  intro_treasure: [
    line("Tadeo", "Eine Schatzkarte! Wer hat die wohl ins Meer geworfen?"),
    line("Tadeo", "Das große X... Da muss etwas vergraben sein!"),
    line("Tadeo", "Ein Schatz! Den hole ich mir!"),
  ],
  intro_sailing: [
    line("Erzähler", "Noch am selben Tag packt Tadeo seinen Rucksack und segelt los."),
  ],
  intro_landing: [
    line("Erzähler", "Die Wellen tragen Tadeo an einen fremden Strand."),
    line("Tadeo", "Uff! Das war knapp. Was für ein riesiger Hai!"),
    line("Tadeo", "Wo bin ich denn hier? So eine große Insel habe ich noch nie gesehen."),
    line("Tadeo", "Und da hinten raucht ein Berg. Ist das etwa ein Vulkan?"),
  ],
  intro_arrival: [
    line("Chuleta", "Gack! Der Hai hat unser Boot kaputt gemacht!"),
    line("Tadeo", "Oh nein, mein schönes Boot! Das fährt nie wieder."),
    line("Tadeo", "Die Karte habe ich noch. Aber ohne Boot komme ich nie zum X."),
    line("Stimme", "Hilfe! Hilfe!"),
    line("Tadeo", "Hast du das gehört? Da ruft jemand!"),
    line("Chuleta", "Das kam vom Vulkan! Gack!"),
    line("Tadeo", "Da oben ist jemand in Gefahr. Wir müssen nachschauen!"),
    line("Chuleta", "Zum Vulkan? Ich bin doch nur ein kleines Huhn! Gack!"),
    line("Tadeo", "Ich passe auf dich auf. Komm, wir schauen nach, wer da ruft!"),
    line("Erzähler", "Der goldene Stern zeigt ihnen den Weg."),
  ],
  // -----------------------------------------------------------------------
  // Milestone 2: Volcano
  // -----------------------------------------------------------------------
  volcano_enter: [
    line("Tadeo", "Hier oben kamen die Rufe her. Hallo? Wer ist da?"),
    line("Stimme", "Hilfe! Ich stecke fest!"),
    line("Tadeo", "Halt durch! Ich komme!"),
    line("Erzähler", "Aber der Vulkan spuckt Feuer und Steine. Der Weg ist gefährlich."),
    line("Tadeo", "Ich muss an den Lavabrocken vorbei."),
  ],
  // Tadeo doesn't know the name yet, so the tag still says Stimme.
  volcano_paco_found: [
    line("Tadeo", "Da ist er! Ein alter Seemann! Sein Fuß steckt unter einem Stein."),
    line("Stimme", "Schnell, Junge! Der Brocken ist so schwer!"),
    line("Tadeo", "Keine Angst! Ich hebe ihn hoch!"),
  ],
  // Paco under the rock is free. The empty hollow behind him is the game's mystery, so he brushes it aside.
  volcano_paco_thanks: [
    line("Käpt'n Paco", "Puh! Danke, Junge! Mein Fuß steckte ganz fest."),
    line("Tadeo", "Ich bin Tadeo. Ich habe dich bis zum Strand rufen gehört."),
    line("Käpt'n Paco", "Und ich bin Käpt'n Paco. Du bist ganz schön mutig!"),
    line("Käpt'n Paco", "Früher bin ich über alle Meere gesegelt. Jetzt wohne ich unten im Dorf."),
    line("Tadeo", "Und was machst du hier oben? Hier ist es doch gefährlich!"),
    line("Käpt'n Paco", "Ich schaue manchmal nach dem Vulkan. Er wird immer wilder."),
    line("Käpt'n Paco", "Und dann kam dieser Brocken geflogen. Bumm! Genau auf meinen Fuß!"),
    line("Tadeo", "Schau mal, der alte Stein da. Er hat ein Loch wie ein Herz!"),
    line("Käpt'n Paco", "Ach, alter Kram. Komm, hier wird es zu heiß!"),
  ],
  volcano_paco_boat: [
    line("Tadeo", "Mein Boot ist kaputt. Ein riesiger Hai war das!"),
    line("Käpt'n Paco", "Der Hai, soso... Keine Angst. Ein Käpt'n kann jedes Boot flicken."),
    line("Käpt'n Paco", "Komm ins Dorf! Dort erzählt dir der Dorfälteste, was hier los ist."),
    line("Käpt'n Paco", "Nimm die Trittsteine am Fluss. Die Brücke geht nicht."),
    line("Käpt'n Paco", "Dort sitzt ein Oger. Er ist böser als sonst und lässt niemanden vorbei."),
    line("Erzähler", "Käpt'n Paco geht voraus. Und Tadeo macht sich auf den Weg ins Dorf."),
  ],
};
