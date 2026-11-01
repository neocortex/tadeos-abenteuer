/**
 * The finale: the way home and the festival.
 */

import type { DialogueLine, DialogueScript } from "../dialogues";

const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });

export const FINALE: Record<string, DialogueScript> = {
  finale_sail_back: [
    line("Erzähler", "Tadeo segelt zurück, so schnell er kann."),
  ],
  finale_climb: [
    line("Tadeo", "Das Herz muss zurück in den alten Stein!"),
    line("Tadeo", "Ich laufe zum goldenen Licht. Los geht's!"),
  ],
  finale_hueter_thanks: [
    line("Hüter", "Danke, Tadeo. Jetzt kann ich endlich ruhen."),
  ],
  festival_talk: [
    line("Käpt'n Paco", "Ich muss euch etwas sagen. Der Pirat... das war ich."),
    line("Käpt'n Paco", "Ich war jung und dumm. Es tut mir leid."),
    line("Käpt'n Paco", "Und die Flaschenpost war auch von mir."),
    line("Tadeo", "P wie Paco!"),
    line("Dorfältester", "Du hast uns Tadeo geschickt. Das hast du gut gemacht."),
    line("Tadeo", "Das Gold ist für das Dorf!"),
    line("Tadeo", "Und was ist das? Ein Plan... für eine Rakete!"),
    line("Chuleta", "Gack! Ein goldenes Ei!"),
  ],
};
