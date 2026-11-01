/**
 * The finale: the way home and the festival.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const FINALE: Record<string, DialogueScript> = {
  finale_sail_back: [
    line("Erzähler", "Tadeo segelt zurück, so schnell er kann."),
    line("Erzähler", "Der Hai schwimmt neben ihm her. Er will auch helfen."),
    line("Erzähler", "Über der Insel ist der Himmel schon ganz rot."),
  ],
  finale_climb: [
    line("Tadeo", "Das Herz muss zurück in den alten Stein!"),
    line("Erzähler", "Das ist der schwerste Weg von allen. Der Vulkan spuckt, so viel er kann."),
    line("Tadeo", "Das Herz auf meinem Rücken ist ganz warm. Das macht mir Mut."),
    line("Tadeo", "Ich laufe zum goldenen Licht. Los geht's!"),
  ],
  finale_stone: [
    line("Tadeo", "Da ist der alte Stein! Und das Loch wie ein Herz."),
    line("Tadeo", "Jetzt kommst du wieder nach Hause, Herz."),
  ],
  finale_calm: [
    line("Erzähler", "Das Licht läuft durch den ganzen Berg. Dann wird der Vulkan ganz still."),
    line("Tadeo", "Er schläft! Der Vulkan schläft wieder!"),
  ],
  finale_hueter_thanks: [
    line("Tadeo", "Hüter! Da bist du ja!"),
    line("Hüter", "Das Herz ist wieder zu Hause. So lange habe ich darauf gewartet."),
    line("Hüter", "Jetzt sind auch alle Wesen wieder lieb. Und der Wald leuchtet."),
    line("Tadeo", "Und der Pirat? Wer war das denn nun?"),
    line("Hüter", "Das wird er dir selbst sagen. Noch heute Abend."),
    line("Hüter", "Danke, Tadeo. Jetzt kann ich endlich ruhen."),
    line("Tadeo", "Leb wohl, Hüter!"),
  ],
  festival_opening: [
    line("Erzähler", "Am Abend feiert das ganze Dorf. Sogar der Oger und Flocke sind da."),
    line("Dorfältester", "Hoch lebe Tadeo! Er hat unsere Insel gerettet!"),
  ],
  festival_talk: [
    line("Käpt'n Paco", "Ich muss euch etwas sagen. Der Pirat... das war ich."),
    line("Erzähler", "Auf einmal ist es ganz still am Feuer."),
    line("Tadeo", "Du, Paco? Aber du bist doch mein Freund!"),
    line("Käpt'n Paco", "Ich war jung und naiv. Es tut mir leid."),
    line("Käpt'n Paco", "Das Herz hat so schön geleuchtet. Aber es hat mir die Hände verbrannt."),
    line("Käpt'n Paco", "Also habe ich es eingefroren und vergraben. Und dann kam der Hai."),
    line("Tadeo", "Der Hai! Hat er dein Schiff auch kaputt gemacht?"),
    line("Käpt'n Paco", "Ja. Und ich habe mich so geschämt. Darum habe ich nie etwas gesagt."),
    line("Käpt'n Paco", "Nur den Schlüssel habe ich heimlich vor die Tür gelegt."),
    line("Käpt'n Paco", "Und die Flaschenpost war auch von mir."),
    line("Tadeo", "P wie Paco!"),
    line("Tadeo", "Darum hast du immer Hm, hm gesagt!"),
    line("Käpt'n Paco", "Ich war zu alt, um selbst zu gehen. Ich brauchte einen Helden."),
    line("Dorfältester", "Du hast uns Tadeo geschickt. Das hast du gut gemacht."),
    line("Dorfältester", "Und du hast die Wahrheit gesagt, Paco. Das war mutig."),
    line("Tadeo", "Das Gold ist für das Dorf!"),
    line("Oger", "Und ich? Gibt es auch Kuchen?"),
    line("Tadeo", "Und das hier war auch in der Truhe. Was ist das nur?"),
    line("Dorfältester", "Zeig mal her... Das gibt es doch nicht! Ein Plan für eine Rakete!"),
    line("Tadeo", "Eine Rakete? Was will man denn mit einer Rakete?"),
    line("Dorfältester", "Eine alte Legende erzählt von einer Rakete. Und von einer Welt, weit, weit weg."),
    line("Tadeo", "Eine andere Welt? Wie kommt man dahin? Was gibt es dort?"),
    line("Dorfältester", "Das, mein Junge, ist eine Geschichte für ein anderes Mal."),
    line("Chuleta", "Gack! Ein goldenes Ei!"),
    line("Erzähler", "Der Vulkan schläft, alle Wesen sind lieb. Und Tadeo schaut hinauf zu den Sternen."),
  ],
};
