/**
 * The legend: the elder's story and the ghost at the lake.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const LEGEND: Record<string, DialogueScript> = {
  // -----------------------------------------------------------------------
  // Quest 3: the elder tells the legend; the map shows where the heart is
  // -----------------------------------------------------------------------
  elder_legend: [
    line("Dorfältester", "Du bist also Tadeo! Paco hat mir alles erzählt. Du hast ihn gerettet. Danke!"),
    line("Tadeo", "Gern! Aber was ist hier los? Warum spuckt der Vulkan Feuer?"),
    line("Dorfältester", "Das ist eine alte Geschichte. Hör gut zu."),
    line("Dorfältester", "Unser Vulkan hat ein Herz: das Feuerherz."),
    line("Dorfältester", "Solange es auf dem alten Stein liegt, schläft der Vulkan."),
    line("Tadeo", "Den Stein habe ich gesehen! Aber da liegt kein Herz. Nur ein Loch!"),
    line("Dorfältester", "Genau. Denn vor langer Zeit kam ein junger Pirat auf unsere Insel."),
    line("Dorfältester", "Er liebte alles, was glänzt. Und das Herz leuchtete heller als alles Gold."),
    line("Dorfältester", "Also hat er es gestohlen. Und zusammen mit seinem Schatz versteckt."),
    line("Tadeo", "Und wo ist der Pirat jetzt?"),
    line("Dorfältester", "Das weiß niemand. Er wurde nie wieder gesehen."),
    line("Käpt'n Paco", "Hm, hm."),
    line("Dorfältester", "Seitdem wacht der Vulkan auf. Und jedes Jahr wird es schlimmer."),
    line("Dorfältester", "Auch die Wesen sind jetzt böser: der Oger auf der Brücke. Und der Hai."),
    line("Tadeo", "Der Hai! Der hat mein Boot kaputt gemacht!"),
    line("Dorfältester", "Wenn das Herz nicht zurückkommt, spuckt der Vulkan bald Feuer über die ganze Insel."),
    line("Dorfältester", "Aber niemand weiß, wo der Schatz des Piraten liegt. Wir haben ihn nie gefunden."),
    // Tadeo's line ends the script; the map card follows it
    line("Tadeo", "Moment! Ich habe eine Karte! Sie war in einer Flaschenpost."),
  ],
  elder_after_map: [
    line("Dorfältester", "Das X! Das ist die kleine Insel im Norden."),
    line("Dorfältester", "Das muss die Karte vom Piraten sein. Dort liegt sein Schatz. Und das Herz!"),
    line("Käpt'n Paco", "Eine Flaschenpost, soso. Hm, hm."),
    line("Tadeo", "Dann hole ich das Herz und bringe es zurück!"),
    line("Chuleta", "Und wie? Wir haben kein Boot. Gack!"),
    line("Käpt'n Paco", "Dein Boot flicke ich. Aber das dauert ein bisschen."),
    line("Dorfältester", "Und auf dem Weg warten viele Gefahren. Wie du das schaffst, weiß nur einer."),
    line("Dorfältester", "Der Geist am See."),
    line("Tadeo", "Ein Geist? Ist der gruselig?"),
    line("Dorfältester", "Er tut dir nichts. Aber er spricht nur mit klugen Leuten."),
    line("Dorfältester", "Am See stehen drei Steintafeln mit Rätseln. Löse sie, dann kommt er."),
    line("Tadeo", "Rätsel mag ich! Komm, Chuleta, wir gehen zum See!"),
  ],
  // -----------------------------------------------------------------------
  // Quest 4: three riddles wake the ghost at the lake (the riddles are in game/lake.ts)
  // -----------------------------------------------------------------------
  // Only at the first tablet Tadeo goes to, before its riddle
  lake_first_tablet: [
    line("Tadeo", "Das müssen die Steintafeln sein. Drei Stück!"),
    line("Chuleta", "Und wo ist der Geist? Ich sehe keinen. Gack!"),
    line("Tadeo", "Erst die Rätsel. Dann kommt er."),
  ],
  // After the first and after the second lit tablet
  lake_lit_first: [
    line("Tadeo", "Richtig! Die Tafel leuchtet! Noch zwei."),
  ],
  lake_lit_second: [
    line("Tadeo", "Noch eine. Gleich sehen wir den Geist!"),
    line("Chuleta", "Gack! Ich mache schon mal die Augen zu."),
  ],
  // After the third tablet, with the camera still on it, before the Hüter rises
  lake_still: [
    line("Erzähler", "Alle drei Tafeln leuchten. Da wird der See ganz still..."),
  ],
  lake_wrong: [
    line("Steintafel", "Hm, das passt noch nicht. Versuch es noch einmal!"),
  ],
  lake_hueter: [
    line("Chuleta", "Gack! Der Geist! Ich gucke gar nicht hin!"),
    line("Hüter", "Hab keine Angst. Du hast meine Rätsel gelöst, Tadeo."),
    line("Hüter", "Ich bin der Hüter. Ich habe auf das Herz aufgepasst."),
    line("Hüter", "Bis der Pirat kam. Ich konnte ihn nicht aufhalten."),
    line("Hüter", "Aber ich bin ein Geist. Ich habe keine Hände."),
    line("Hüter", "Du hast Hände, Tadeo. Bring das Herz zurück!"),
    line("Tadeo", "Das will ich ja! Aber wie komme ich an das Herz?"),
    line("Hüter", "Als der Pirat es nahm, hat es ihm die Hände verbrannt."),
    line("Chuleta", "Autsch! Gack!"),
    line("Hüter", "Also stieg er auf den Berg und holte Zauber-Eis. Das schmilzt nie."),
    line("Hüter", "Damit fror er das Herz in seine Truhe ein. Dann fuhr er aufs Meer."),
    line("Tadeo", "Zu der Insel mit dem X!"),
    line("Hüter", "Für den Weg dorthin brauchst du vier Dinge. Merk dir meinen Spruch."),
  ],
  // The four rhyming lines, then Tadeo's plain version of them
  lake_rhyme: [
    line("Hüter", "Das Schwert aus dem Fels zerschneidet den Dorn,"),
    line("Hüter", "die Beere im Wald nimmt den Wesen den Zorn."),
    line("Hüter", "Der Hammer vom Berg zerschlägt das Eis,"),
    line("Hüter", "der Schlüssel vom Dorf für das Herz, so heiß."),
    line("Tadeo", "Also: Das Schwert für die Dornen. Die Beeren für die Wesen."),
    line("Tadeo", "Der Hammer für das Eis. Der Schlüssel für die Truhe!"),
  ],
  lake_after_rhyme: [
    line("Hüter", "Genau so. Die Dornen versperren das Tor zum Zauberwald. Nur das Schwert kommt durch."),
    line("Hüter", "Die Beeren aus dem Wald machen böse Wesen wieder lieb. Auch den Hai."),
    line("Hüter", "Der Hammer liegt noch auf dem Berg. Er war dem Piraten zu schwer."),
    line("Chuleta", "Zu schwer für einen Piraten? Gack! Das kann ja was werden!"),
    line("Hüter", "Den Schlüssel für die Truhe musst du im Dorf suchen."),
    line("Hüter", "Beginne mit dem Schwert. Es liegt in der Höhle."),
    line("Tadeo", "Und das Herz? Ist das nicht furchtbar heiß?"),
    line("Hüter", "Keine Angst vor dem Herz. Es verbrennt nur Diebe."),
    line("Tadeo", "Und der Pirat? Wo ist der jetzt?"),
    line("Hüter", "Der Pirat... Er ist näher, als du denkst."),
  ],
  // After the Hüter has faded away
  lake_gone: [
    line("Tadeo", "Warte! Wie meinst du das?"),
    line("Erzähler", "Aber der Hüter ist schon verschwunden."),
    line("Tadeo", "Also zuerst das Schwert. Auf zur Höhle!"),
  ],
};
