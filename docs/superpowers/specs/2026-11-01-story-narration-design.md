# Story narration — design

Status: written for the owner's approval (2026-11-01). Builds on `2026-10-30-story-rethink-design.md`: the story and the
quests stay exactly as they are. What is said changes, plus the small staging that the new lines need and one visual
addition the owner decided on: the view from the summit.

## Why

The owner played the twelve quests and found the talking short and abrupt: "when he meets Paco the dialogue is very
short and abrupt, same in the village, lake, etc. It should be simple, but it should be narrated such that the story and
the purpose is clear; both when background story is being told, but also when something happens or is about to happen."

The cause is a rule in the story rethink: at most 5 lines per conversation. It kept the talk simple, and it also cut out
the reactions, the questions and the reasons. The narrator has only 8 story lines in the whole game, and most quests end
with nothing but a one-line Chuleta bubble.

The owner read drafts of the landing, the volcano start, Paco and the elder and said the level "feels much better in
total", and that this is how it should be in the other scenes.

## Goals

Every quest follows the same pattern, told in simple lines:

1. **Before:** where Tadeo is going, and why.
2. **When something happens:** somebody reacts to it, so the child knows what it means.
3. **After:** what he has now, and where he goes next and why.

The narrator is a regular voice for moments and changes of place. Tadeo's feelings and questions carry the backstory, so
that nobody gives a speech.

## Non-goals

- No change to how the challenges play, the island, the quest order, the rewards, the HUD or the saves.
- The side games (fishing, hens), the villagers' casual chats and `CHULETA_HINTS` stay as they are.
- The village's drum and maths lines stay, except where the script below says otherwise.
- `classic-2d/` stays frozen.

## Anti-goals (a failure even if it works)

- **Long speeches.** Nobody explains for long without somebody else coming in.
- **Hard words.** Everything has to be understood by a 7-year-old on first hearing.
- **Saying the same thing twice** within a few lines, or naming the same thing in two scenes in a row without a reason.
- **Lines that don't match the picture**, such as a speaker talking about something that has already left the screen.
- **Talk during play.** New conversations only go where the game already pauses. Bubbles stay as they are.
- **A broken scene** when Space is mashed, or when a game is continued from a save.

## Language rules

These replace the rules in the story rethink's "Language rules":

- At most 14 words per spoken line. **This stays.** Most lines have one or two short sentences; 29 lines of the script
  below have three or four, because they hold a short cry like "Puh!" or "Danke!".
- The limit of 5 lines per conversation **goes**. As a guide, a quest moment runs 3 to 8 lines and a big story scene 10 to
  30. The elder's talk and the Hüter's are the longest in the game, because they carry the backstory.
- The words stay as in the story rethink: "das alte Volk", "der alte Stein", "Zaubereis", "wieder lieb machen".
- **"Wesen", never "Monster".** The owner's correction: the shark isn't a monster. This goes for every line, the rhyme and
  the berries' description in `data/items.ts`.
- **Nobody says what they can't know.** Every fact a character uses was told to them on screen before, or they say they
  still have to find out. The owner's correction, on Tadeo knowing that the key waits in the village.
- Chuleta only speaks with her voice and portrait inside the challenges, as she does today. There she sits in the
  backpack. Her model appears only on the island, at the festival and in the side games.

## Who tells the background story

The owner asked that the background be clear while the child plays, and not only at the end. It is told in pieces, by
whoever would know it:

| What the child learns | Who says it |
|---|---|
| The volcano has a heart, and while it lies on the old stone the volcano sleeps | The elder, quest 3 |
| A young pirate loved all that shines, stole the heart and hid it with his treasure | The elder, quest 3 |
| Since then the volcano wakes a little more each year, and the ogre and the shark have turned angrier | The elder, quest 3 |
| The bottle's map is the pirate's, so the X means his treasure and the heart | The elder, quest 3 |
| The heart burned the pirate's hands, so he fetched Zaubereis from the mountain and froze it into his chest | The Hüter, quest 4 |
| What each of the four things is for, and why the hammer is still on the mountain (too heavy for him) | The Hüter, quest 4 |
| The old people made the sword from crystal and hid it so that only clever people find it | The mole, quest 5 |
| Who the pirate was, why he kept quiet, the key and the bottle | Paco, at the festival |
| The plan is for a rocket, and there is a legend of a world far, far away | The elder, at the festival |

## The script

Once the owner has approved this document the lines are final, and nothing is recorded before that. If a line then turns
out not to fit the picture, a small change of wording is fine as long as the facts and the simplicity stay. The names in
`code font` are the keys in `DIALOGUES` or the constants in the challenge's script file. New ones are marked *new*.

### 1. Ankunft

`intro_bottle`: on the beach of his holiday.

- **Erzähler:** Das ist Tadeo. Er macht gerade Ferien am Meer.
- **Erzähler:** Jeden Morgen sucht er am Strand nach Muscheln und anderen Schätzen.
- **Erzähler:** Eines Morgens findet er etwas ganz Besonderes: eine Flaschenpost!
- **Tadeo:** Nanu? Da ist ja etwas drin!
- **Erzähler:** Darin ist eine alte Schatzkarte. Sie zeigt eine kleine Insel mit einem großen X.

*The map card appears.*

`intro_treasure`: Tadeo's close-up. The last line is his big line into the camera, as today.

- **Tadeo:** Eine Schatzkarte! Wer hat die wohl ins Meer geworfen?
- **Tadeo:** Das große X... Da muss etwas vergraben sein!
- **Tadeo:** Ein Schatz! Den hole ich mir!

`intro_sailing` (*new*): over black, between the beach and the sea. The sea scene with the shark stays without words.

- **Erzähler:** Noch am selben Tag packt Tadeo seinen Rucksack und segelt los.

`intro_landing` (*new*): after the flight, before Chuleta climbs out.

- **Erzähler:** Ein Hai hat Tadeos Boot angegriffen!
- **Erzähler:** Zum Glück haben die Wellen Tadeo an einen fremden Strand getragen.
- **Tadeo:** Uff! Das war knapp. Was für ein riesiger Hai!
- **Tadeo:** Wo bin ich denn hier? So eine große Insel habe ich noch nie gesehen.
- **Tadeo:** Und da hinten raucht ein Berg. Ist das etwa ein Vulkan?

`CHULETA_INTRO`: she climbs out of the backpack first, as today.

- **Chuleta:** Und mich hast du wohl vergessen? Ich saß die ganze Zeit in deinem Rucksack!
- **Tadeo:** Chuleta! Du bist ja mitgekommen! Bin ich froh!

`intro_arrival`:

- **Chuleta:** Gack! Der Hai hat unser Boot kaputt gemacht!
- **Tadeo:** Oh nein, mein schönes Boot! Das fährt nie wieder.
- **Tadeo:** Die Karte habe ich noch. Aber ohne Boot komme ich nie zum X.
- **Stimme:** Hilfe! Hilfe!
- **Tadeo:** Hast du das gehört? Da ruft jemand!
- **Chuleta:** Das kam vom Vulkan! Gack!
- **Tadeo:** Da oben ist jemand in Gefahr. Wir müssen nachschauen!
- **Chuleta:** Zum Vulkan? Ich bin doch nur ein kleines Huhn! Gack!
- **Tadeo:** Ich passe auf dich auf. Komm, wir schauen nach, wer da ruft!
- **Erzähler:** Der goldene Stern zeigt ihnen den Weg.

### 2. Der Vulkan

`volcano_enter`: the three lines of `TIPS` follow, unchanged.

- **Tadeo:** Hier oben kamen die Rufe her. Hallo? Wer ist da?
- **Stimme:** Hilfe! Ich stecke fest!
- **Tadeo:** Halt durch! Ich komme!
- **Erzähler:** Aber der Vulkan spuckt Feuer und Steine. Der Weg ist gefährlich.
- **Tadeo:** Ich muss an den Lavabrocken vorbei.

`volcano_paco_found` (*new*): Tadeo has reached the goal and stands at the rock, before the "Heben" prompt. Tadeo doesn't
know the name yet, so the name tag still says Stimme.

- **Tadeo:** Da ist er! Ein alter Seemann! Sein Fuß steckt unter einem Stein.
- **Stimme:** Schnell, Junge! Der Brocken ist so schwer!
- **Tadeo:** Keine Angst! Ich hebe ihn hoch!

`volcano_paco_thanks`: the camera goes to the old stone on the line about the hole, and back on Paco's answer.

- **Käpt'n Paco:** Puh! Danke, Junge! Mein Fuß steckte ganz fest.
- **Tadeo:** Ich bin Tadeo. Ich habe dich bis zum Strand rufen gehört.
- **Käpt'n Paco:** Und ich bin Käpt'n Paco. Du bist ganz schön mutig!
- **Käpt'n Paco:** Früher bin ich über alle Meere gesegelt. Jetzt wohne ich unten im Dorf.
- **Tadeo:** Und was machst du hier oben? Hier ist es doch gefährlich!
- **Käpt'n Paco:** Ich schaue manchmal nach dem Vulkan. Er wird immer wilder.
- **Käpt'n Paco:** Und dann kam dieser Brocken geflogen. Bumm! Genau auf meinen Fuß!
- **Tadeo:** Schau mal, der alte Stein da. Er hat ein Loch wie ein Herz!
- **Käpt'n Paco:** Ach, alter Kram. Komm, hier wird es zu heiß!

`volcano_paco_boat`:

- **Tadeo:** Mein Boot ist kaputt. Ein riesiger Hai war das!
- **Käpt'n Paco:** Der Hai, soso... Keine Angst. Ein Käpt'n kann jedes Boot flicken.
- **Käpt'n Paco:** Komm ins Dorf! Dort erzählt dir der Dorfälteste, was hier los ist.
- **Käpt'n Paco:** Nimm die Trittsteine am Fluss. Die Brücke geht nicht.
- **Käpt'n Paco:** Dort sitzt ein Oger. Er ist böser als sonst und lässt niemanden vorbei.
- **Erzähler:** Käpt'n Paco geht voraus. Und Tadeo macht sich auf den Weg ins Dorf.

### 3. Das Dorf

`elder_legend`:

- **Dorfältester:** Du bist also Tadeo! Paco hat mir alles erzählt. Du hast ihn gerettet. Danke!
- **Tadeo:** Gern! Aber was ist hier los? Warum spuckt der Vulkan Feuer?
- **Dorfältester:** Das ist eine alte Geschichte. Hör gut zu.
- **Dorfältester:** Unser Vulkan hat ein Herz: das Feuerherz.
- **Dorfältester:** Solange es auf dem alten Stein liegt, schläft der Vulkan.
- **Tadeo:** Den Stein habe ich gesehen! Aber da liegt kein Herz. Nur ein Loch!
- **Dorfältester:** Genau. Denn vor langer Zeit kam ein junger Pirat auf unsere Insel.
- **Dorfältester:** Er liebte alles, was glänzt. Und das Herz leuchtete heller als alles Gold.
- **Dorfältester:** Also hat er es gestohlen. Und zusammen mit seinem Schatz versteckt.
- **Tadeo:** Und wo ist der Pirat jetzt?
- **Dorfältester:** Das weiß niemand. Er wurde nie wieder gesehen.
- **Käpt'n Paco:** Hm, hm.
- **Dorfältester:** Seitdem wacht der Vulkan auf. Und jedes Jahr wird es schlimmer.
- **Dorfältester:** Auch die Wesen sind jetzt böser: der Oger auf der Brücke. Und der Hai.
- **Tadeo:** Der Hai! Der hat mein Boot kaputt gemacht!
- **Dorfältester:** Wenn das Herz nicht zurückkommt, spuckt der Vulkan bald Feuer über die ganze Insel.
- **Dorfältester:** Aber niemand weiß, wo der Schatz des Piraten liegt. Wir haben ihn nie gefunden.
- **Tadeo:** Moment! Ich habe eine Karte! Sie war in einer Flaschenpost.

*The map card appears.*

`elder_after_map`:

- **Dorfältester:** Das X! Das ist die kleine Insel im Norden.
- **Dorfältester:** Das muss die Karte vom Piraten sein. Dort liegt sein Schatz. Und das Herz!
- **Käpt'n Paco:** Eine Flaschenpost, soso. Hm, hm.
- **Tadeo:** Dann hole ich das Herz und bringe es zurück!
- **Chuleta:** Und wie? Wir haben kein Boot. Gack!
- **Käpt'n Paco:** Dein Boot flicke ich. Aber das dauert ein bisschen.
- **Dorfältester:** Und auf dem Weg warten viele Gefahren. Wie du das schaffst, weiß nur einer.
- **Dorfältester:** Der Geist am See.
- **Tadeo:** Ein Geist? Ist der gruselig?
- **Dorfältester:** Er tut dir nichts. Aber er spricht nur mit klugen Leuten.
- **Dorfältester:** Am See stehen drei Steintafeln mit Rätseln. Löse sie, dann kommt er.
- **Tadeo:** Rätsel mag ich! Komm, Chuleta, wir gehen zum See!

### 4. Der See

`lake_first_tablet` (*new*): only at the first tablet Tadeo goes to, before its riddle.

- **Tadeo:** Das müssen die Steintafeln sein. Drei Stück!
- **Chuleta:** Und wo ist der Geist? Ich sehe keinen. Gack!
- **Tadeo:** Erst die Rätsel. Dann kommt er.

`lake_lit_first` (*new*): after the first lit tablet.

- **Tadeo:** Richtig! Die Tafel leuchtet! Noch zwei.

`lake_lit_second` (*new*): after the second.

- **Tadeo:** Noch eine. Gleich sehen wir den Geist!
- **Chuleta:** Gack! Ich mache schon mal die Augen zu.

`lake_still` (*new*): after the third, with the camera still on the tablet, before the Hüter rises.

- **Erzähler:** Alle drei Tafeln leuchten. Da wird der See ganz still...

`lake_hueter`:

- **Chuleta:** Gack! Der Geist! Ich gucke gar nicht hin!
- **Hüter:** Hab keine Angst. Du hast meine Rätsel gelöst, Tadeo.
- **Hüter:** Ich bin der Hüter. Ich habe auf das Herz aufgepasst.
- **Hüter:** Bis der Pirat kam. Ich konnte ihn nicht aufhalten.
- **Hüter:** Aber ich bin ein Geist. Ich habe keine Hände.
- **Hüter:** Du hast Hände, Tadeo. Bring das Herz zurück!
- **Tadeo:** Das will ich ja! Aber wie komme ich an das Herz?
- **Hüter:** Als der Pirat es nahm, hat es ihm die Hände verbrannt.
- **Chuleta:** Autsch! Gack!
- **Hüter:** Also stieg er auf den Berg und holte Zaubereis. Das schmilzt nie.
- **Hüter:** Damit fror er das Herz in seine Truhe ein. Dann fuhr er aufs Meer.
- **Tadeo:** Zu der Insel mit dem X!
- **Hüter:** Für den Weg dorthin brauchst du vier Dinge. Merk dir meinen Spruch.

`lake_rhyme`: the four rhyming lines and Tadeo's two plain ones, with "Wesen" in place of "Monster".

- **Hüter:** Das Schwert aus dem Fels zerschneidet den Dorn,
- **Hüter:** die Beere im Wald nimmt den Wesen den Zorn.
- **Hüter:** Der Hammer vom Berg zerschlägt das Eis,
- **Hüter:** der Schlüssel vom Dorf für das Herz, so heiß.
- **Tadeo:** Also: Das Schwert für die Dornen. Die Beeren für die Wesen.
- **Tadeo:** Der Hammer für das Eis. Der Schlüssel für die Truhe!

`lake_after_rhyme`:

- **Hüter:** Genau so. Die Dornen versperren das Tor zum Zauberwald. Nur das Schwert kommt durch.
- **Hüter:** Die Beeren aus dem Wald machen böse Wesen wieder lieb. Auch den Hai.
- **Hüter:** Der Hammer liegt noch auf dem Berg. Er war dem Piraten zu schwer.
- **Chuleta:** Zu schwer für einen Piraten? Gack! Das kann ja was werden!
- **Hüter:** Den Schlüssel für die Truhe musst du im Dorf suchen.
- **Hüter:** Beginne mit dem Schwert. Es liegt in der Höhle.
- **Tadeo:** Und das Herz? Ist das nicht furchtbar heiß?
- **Hüter:** Keine Angst vor dem Herz. Es verbrennt nur Diebe.
- **Tadeo:** Und der Pirat? Wo ist der jetzt?
- **Hüter:** Der Pirat... Er ist näher, als du denkst.

*The Hüter fades away.*

`lake_gone` (*new*):

- **Tadeo:** Warte! Wie meinst du das?
- **Erzähler:** Aber der Hüter ist schon verschwunden.
- **Tadeo:** Also zuerst das Schwert. Auf zur Höhle!

`CHULETA_CHEERS[4]` changes, because Tadeo now asks the old question himself:

- **Chuleta:** Näher, als du denkst? Gack! Jetzt schaue ich mich dauernd um!

### 5. Die Höhle

`cave_enter`:

- **Erzähler:** Tief im Berg liegt die Höhle. Hier soll das Schwert sein.
- **Tadeo:** Eine dunkle Höhle! Zum Glück habe ich meine Fackel.
- **Tadeo:** Da vorne versperren Steine den Weg. Und da sitzt ein Maulwurf!
- **Tadeo:** Vielleicht kann er mir helfen.

`moleAsks`, and `moleSmells` with its own last line when Tadeo already carries a mushroom:

- **Tadeo:** Hallo, Maulwurf! Ich suche das Schwert vom Hüter.
- **Maulwurf:** Das Schwert? Das liegt ganz hinten in der Höhle.
- **Maulwurf:** Aber der Vulkan wackelt so viel. Überall fallen Steine herunter.
- **Tadeo:** Kannst du sie wegräumen? Du kannst doch graben!
- **Maulwurf:** Ich habe Hunger! Bring mir einen Leuchtpilz, dann grabe ich dir den Weg frei.

(`moleSmells` ends with its line as it is today: "Ich rieche einen Leuchtpilz! Gib ihn mir, dann grabe ich dir
den Weg frei.")

`moleAsksTwo`:

- **Maulwurf:** Noch mehr Steine! Bring mir zwei Leuchtpilze, dann grabe ich wieder.
- **Tadeo:** Zwei? Du isst aber viel!
- **Maulwurf:** Graben macht hungrig!
- **Tadeo:** Also gut. Ich suche links und rechts!

`moleFed[1]`, after the second meal:

- **Maulwurf:** Mmh, satt! Hinter den Steinen ist die Wand vom alten Volk.
- **Tadeo:** Das alte Volk? Wer ist das?
- **Maulwurf:** Die haben hier vor langer Zeit gelebt. Sie haben das Schwert aus Kristall gemacht.
- **Maulwurf:** Sie wollten, dass nur kluge Leute es finden. Viel Glück!

`paintings`:

- **Tadeo:** Eine Wand aus Kristall! Wie komme ich da durch?
- **Tadeo:** Die Bilder an der Wand! Erst der Vulkan, dann der Schneeberg, dann der Wald.
- **Tadeo:** Rot wie der Vulkan, weiß wie der Schnee, grün wie der Wald!
- **Tadeo:** Das ist bestimmt die Reihenfolge für die Kristalle!

`cave_sword_before` (*new*, the first half of today's `cave_sword`): before he pulls it.

- **Erzähler:** Ein Lichtstrahl fällt durch die Decke, genau auf den großen Kristall.
- **Tadeo:** Das Schwert! Es leuchtet blau.
- **Tadeo:** Wie lange es wohl schon hier steckt? Jetzt hole ich es raus!

`cave_sword_after` (*new*, the second half): with the sword held up.

- **Tadeo:** Das Schwert aus dem Fels! Genau wie im Spruch vom Hüter.
- **Tadeo:** Damit komme ich durch die Dornen!
- **Tadeo:** Jetzt fehlen noch drei Sachen. Als Nächstes die Beeren im Zauberwald!

### 6. Der Zauberwald

`forest_hedge` (*new*): on the island on the lake side of the arch, right before the thorns open. The arch is the only way
into the Zauberwald and the thorns block it, as in `42aba37`. It only plays when the hedge is still up.

- **Tadeo:** Das ist das Tor zum Zauberwald. Nur hier kommt man hinein.
- **Tadeo:** Aber die Dornen versperren den Weg.
- **Chuleta:** Aua! Schon vom Hingucken piekst es. Gack!
- **Tadeo:** Mal sehen, ob das Schwert wirklich hilft.

*The hedge opening plays, without words.*

`forest_hedge_open` (*new*):

- **Chuleta:** Sie sind weg! Einfach so! Gack!
- **Tadeo:** Das Tor ist frei! Auf in den Zauberwald!

`forest_enter`:

- **Erzähler:** Hinter der Hecke beginnt der Zauberwald. Alles glitzert und leuchtet.
- **Tadeo:** Wow! Hier müssen die Zauberbeeren wachsen.
- **Tadeo:** Aber der Wald ist so groß. Wie soll ich sie nur finden?

`MEET_FOX`:

- **Fuchs:** Hallo Tadeo! Ich bin Flocke, der Zauberfuchs.
- **Tadeo:** Ein Fuchs, der sprechen kann! Woher kennst du meinen Namen?
- **Fuchs:** Im Wald spricht sich alles schnell herum.
- **Fuchs:** Das Schwert vom Hüter! Nur vor seinem Licht haben die Dornen Angst.
- **Tadeo:** Ich brauche Zauberbeeren. Der Hüter sagt, sie machen böse Wesen wieder lieb.
- **Fuchs:** Das stimmt. Aber die Büsche hier drin sind nur wilde Dornen. Lauf einfach drumherum.
- **Fuchs:** Fünf Zauberbeeren leuchten im Wald. Folge mir!

`forest_complete`:

- **Tadeo:** Zauberbeeren! Die machen böse Wesen wieder lieb.
- **Fuchs:** Nimm sie mit. Und bring das Herz zurück, damit der Wald weiter leuchtet.
- **Tadeo:** Das mache ich! Danke, Flocke.
- **Tadeo:** Der Hüter hat gesagt, der Schlüssel ist im Dorf. Ich frage dort nach!

### 7. Das Dorf again

`village_enter`:

- **Tadeo:** Ich bin wieder da! Das Schwert und die Zauberbeeren habe ich schon.
- **Dorfältester:** Das ist ja wunderbar, Tadeo! Was fehlt dir noch?
- **Tadeo:** Der Hüter sagt, der Schlüssel ist hier im Dorf. Hast du ihn?
- **Dorfältester:** Der alte Schlüssel? Der lag eines Morgens vor meiner Tür.
- **Dorfältester:** Mit einem Zettel: Nur für jemanden, der klug ist. Darum gibt es die Prüfungen.
- **Tadeo:** Wer hat ihn dir denn gebracht?
- **Dorfältester:** Das weiß niemand. Und wofür er ist, wussten wir auch nie.
- **Käpt'n Paco:** Hm, hm.
- **Dorfältester:** Jetzt wissen wir es. Komm mit zum Feuerkreis, Tadeo!

`WELCOME`:

- **Dorfältester:** Willkommen am Feuerkreis, Tadeo! Nur wer klug ist, bekommt den Schlüssel.
- **Dorfältester:** Es gibt drei Prüfungen. Zwei auf den Zaubertrommeln und eine mit Zahlen.

The other lines of the trials stay.

`village_after`: Tadeo brings up the hammer, because he heard about it from the Hüter and the elder didn't.

- **Dorfältester:** Du hast ihn dir verdient!
- **Tadeo:** Jetzt fehlt nur noch der Hammer. Der liegt oben auf dem Berg.
- **Dorfältester:** Auf dem Berg? Aber ein Riesenfels versperrt den Weg.
- **Dorfältester:** Nur der Oger ist stark genug, ihn wegzuheben.
- **Tadeo:** Der Oger? Der lässt doch niemanden vorbei!
- **Chuleta:** Der ist doch nur wütend! Gack! Die Beeren!
- **Tadeo:** Genau! Die Beeren machen ihn wieder lieb. Komm, wir gehen zur Brücke!

### 8. Der Oger

`ogre_enter`:

- **Erzähler:** Da ist er! Der Oger ist noch größer, als Tadeo gedacht hat.
- **Tadeo:** Ich brauche deine Hilfe!
- **Oger:** GRRR! Das ist MEINE Brücke! Keiner kommt hier rüber!
- **Tadeo:** Ich will gar nicht rüber. Ich habe eine Zauberbeere für dich!
- **Oger:** HA! Erst musst du an mir vorbei!
- **Tadeo:** So ist er zu wütend für eine Beere. Erst muss ich ihn müde machen.

`ogre_defeat`: the first line and `BERRY_OFFER`, `BERRY_THANKS` stay. After he has eaten:

- **Oger:** Oh... Ich war gar nicht immer so böse.
- **Oger:** Seit vielen Jahren bin ich nur noch wütend. Ich wusste nie, warum.
- **Tadeo:** Das kommt vom Feuerherz. Ein Pirat hat es gestohlen. Ich bringe es zurück.
- **Oger:** Du bist mein Freund, Tadeo. Wie kann ich dir helfen?
- **Tadeo:** Komm mit zum Berg! Da liegt etwas sehr Schweres im Weg.

`ogre_boulder`: unchanged.

`ogre_boulder_done`:

- **Chuleta:** Wow! Mit einer Hand! Gack!
- **Tadeo:** Danke, Oger! Jetzt ist der Weg zum Hammer frei.
- **Tadeo:** Dann brauche ich nur noch mein Boot. Paco flickt es gerade.
- **Oger:** Das Boot? Das trage ich dir zum Steg. Das ist ganz leicht!

### 9. Der Berg

`mountain_enter`: the two lines of `TIP` follow, unchanged.

- **Erzähler:** Der Berg ist so hoch, dass ganz oben Schnee liegt.
- **Chuleta:** Ein alter Schrein! Den hat das alte Volk gebaut.
- **Tadeo:** Dort oben liegt der goldene Hammer!
- **Tadeo:** Der Weg ist ganz schön alt. Hoffentlich hält er noch.
- **Chuleta:** Und pass auf die rollenden Steine auf! Gack!

`mountain_complete`: from the narrator's line on, the camera shows the small island and the fin far out at sea, which the
scene gets for this moment (see the table below).

- **Tadeo:** Der goldene Hammer! Der Hammer vom Berg zerschlägt das Eis.
- **Tadeo:** Jetzt habe ich alle vier Sachen: Schwert, Beeren, Schlüssel und Hammer!
- **Erzähler:** Von hier oben sieht Tadeo die ganze Insel. Und weit draußen im Meer...
- **Chuleta:** Schau, die kleine Insel! Und da ist die Flosse...
- **Tadeo:** Der Hai schwimmt um die Insel. Da muss ich vorbei!
- **Tadeo:** Jetzt brauche ich mein Boot. Schnell zum Steg im Norden!

### 10. Der Hai

`sea_dock`:

- **Käpt'n Paco:** Dein Boot ist geflickt! Der Oger hat es hergetragen.
- **Tadeo:** Wie neu! Danke, Paco! Du bist ein echter Käpt'n.
- **Käpt'n Paco:** Hast du alles dabei? Der Hai schwimmt immer noch um die Insel.
- **Tadeo:** Ich weiß. Aber ich habe die Zauberbeeren!
- **Käpt'n Paco:** Folge den leuchtenden Seesternen. Da ist das Wasser sicher.
- **Tadeo:** Woher weißt du das so genau?
- **Käpt'n Paco:** Ach... Ein alter Käpt'n weiß so etwas. Gute Fahrt, Tadeo!

`sea_crossing`:

- **Erzähler:** Zum zweiten Mal fährt Tadeo aufs Meer hinaus. Diesmal ist er bereit.
- **Tadeo:** Die kleine Schatzinsel liegt dort drüben! Ich muss mit dem Boot rüberfahren.
- **Chuleta:** Diesmal machen wir das Boot aber nicht kaputt! Gack!
- **Erzähler:** Vorsicht — hohe Wellen! Weiche ihnen mit den Pfeiltasten aus!

`sea_shark`: the berries come out on "Hier, Hai!", not on Tadeo's first line.

- **Erzähler:** Plötzlich erscheint eine riesige Flosse im Wasser...
- **Tadeo:** Da ist er! Der Hai, der mein Boot kaputt gemacht hat!
- **Chuleta:** Der Hai ist auch nur wütend! Gack! Die Beeren!
- **Tadeo:** Hier, Hai! Mach den Mund auf!

`shark_defeat`: after the shark has swum away. The line about the X goes, because the treasure scene says it right after.

- **Tadeo:** Der Hai ist wieder lieb! Jetzt kann ich sicher zur Schatzinsel fahren!
- **Chuleta:** Er hat mit der Flosse gewinkt! Gack!
- **Tadeo:** Er war nur so böse, weil das Herz fehlt. Armer Hai!

`sea_landed` (*new*): on the sand after the landing, where the second half of `shark_defeat` is today.

- **Tadeo:** Geschafft! Endlich sind wir auf der Insel von der Karte!
- **Chuleta:** Fester Boden! Gack! Nie wieder Boot!

### 11. Die Schatzinsel

`treasure_arrive`:

- **Tadeo:** Die Schatzinsel! Hier muss der Schatz vergraben sein!
- **Chuleta:** Und das Feuerherz! Vergiss das Herz nicht! Gack!
- **Tadeo:** Ich schaue noch einmal auf die Karte.

*The map card appears, and Tadeo walks to the X.*

`treasure_dig_start` (*new*, the second half of today's `treasure_arrive`):

- **Erzähler:** Ein großes X markiert die Stelle. Tadeo beginnt zu graben...

`treasure_dig`:

- **Tadeo:** Eine Truhe! Aber sie steckt in Eis.
- **Chuleta:** Das ist Zaubereis! Das schmilzt nie.
- **Chuleta:** Nur der Hammer schafft es!
- **Tadeo:** Der Hammer vom Berg zerschlägt das Eis. Genau wie im Spruch!

`treasure_hammer`:

- **Erzähler:** Mit einem mächtigen Schlag zerschmettert Tadeo das Eis!
- **Tadeo:** Jetzt noch der Goldene Schlüssel...
- **Tadeo:** Hoffentlich passt er. Das ganze Dorf hat ihn so lange aufgehoben.

`treasure_note`:

- **Tadeo:** Ein Zettel. "Es tut mir leid. P."
- **Chuleta:** P? Wie Pirat?
- **Tadeo:** Dem Piraten tut es leid? Das ist aber komisch.

`treasure_heart_before` (*new*, the first half of today's `treasure_heart`): before he touches it.

- **Tadeo:** Das Herz! Ich habe ein bisschen Angst...
- **Chuleta:** Der Hüter hat gesagt: Es verbrennt nur Diebe. Gack!
- **Tadeo:** Ich bin kein Dieb. Ich bringe es nach Hause.

`treasure_heart_held` (*new*, the second half): with the heart in his hands.

- **Tadeo:** Oh. Es ist ganz warm!
- **Erzähler:** Das Feuerherz klopft ganz leise. Wie ein echtes Herz.
- **Tadeo:** Keine Angst, Herz. Ich bringe dich heim.

`treasure_plan`: Tadeo doesn't know what it is, and that is the start of the teaser.

- **Tadeo:** Eine Papierrolle? Da sind seltsame Linien drauf. Was ist das nur?
- **Tadeo:** Keine Ahnung. Die nehme ich mit. Vielleicht weiß der Dorfälteste mehr.

`treasure_gold`: unchanged.

`treasure_crown` (*new*): after the crown has landed on his head and before the ground starts to shake.

- **Chuleta:** Gack! Du siehst aus wie ein König!
- **Tadeo:** Ich habe es geschafft! Das Herz und den Schatz!

`treasure_erupt`:

- **Erzähler:** Da! Der Vulkan spuckt Feuer! Schnell zurück!
- **Tadeo:** Oh nein! Das Dorf! Alle sind in Gefahr!
- **Chuleta:** Das Herz muss zurück auf den Stein! Schnell, zum Boot! Gack!

### 12. Das Herz des Vulkans

`finale_sail_back`: over black.

- **Erzähler:** Tadeo segelt zurück, so schnell er kann.
- **Erzähler:** Der Hai schwimmt neben ihm her. Er will auch helfen.
- **Erzähler:** Über der Insel ist der Himmel schon ganz rot.

`finale_climb`:

- **Tadeo:** Das Herz muss zurück in den alten Stein!
- **Erzähler:** Das ist der schwerste Weg von allen. Der Vulkan spuckt, so viel er kann.
- **Tadeo:** Das Herz auf meinem Rücken ist ganz warm. Das macht mir Mut.
- **Tadeo:** Ich laufe zum goldenen Licht. Los geht's!

`finale_stone` (*new*): Tadeo has walked up to the stone, before the "Einsetzen" prompt.

- **Tadeo:** Da ist der alte Stein! Und das Loch wie ein Herz.
- **Tadeo:** Jetzt kommst du wieder nach Hause, Herz.

`finale_calm` (*new*): after the eruption has died down, before the Hüter rises.

- **Erzähler:** Das Licht läuft durch den ganzen Berg. Dann wird der Vulkan ganz still.
- **Tadeo:** Er schläft! Der Vulkan schläft wieder!

`finale_hueter_thanks`:

- **Tadeo:** Hüter! Da bist du ja!
- **Hüter:** Das Herz ist wieder zu Hause. So lange habe ich darauf gewartet.
- **Hüter:** Jetzt sind auch alle Wesen wieder lieb. Und der Wald leuchtet.
- **Tadeo:** Und der Pirat? Wer war das denn nun?
- **Hüter:** Das wird er dir selbst sagen. Noch heute Abend.
- **Hüter:** Danke, Tadeo. Jetzt kann ich endlich ruhen.
- **Tadeo:** Leb wohl, Hüter!

`festival_opening` (*new*): at the fire, where everyone cheers and before Paco gets up.

- **Erzähler:** Am Abend feiert das ganze Dorf. Sogar der Oger und Flocke sind da.
- **Dorfältester:** Hoch lebe Tadeo! Er hat unsere Insel gerettet!

`festival_talk`: every line has its own beat in `challenges/festival/script.ts`, see below.

- **Käpt'n Paco:** Ich muss euch etwas sagen. Der Pirat... das war ich.
- **Erzähler:** Auf einmal ist es ganz still am Feuer.
- **Tadeo:** Du, Paco? Aber du bist doch mein Freund!
- **Käpt'n Paco:** Ich war jung und dumm. Es tut mir leid.
- **Käpt'n Paco:** Das Herz hat so schön geleuchtet. Aber es hat mir die Hände verbrannt.
- **Käpt'n Paco:** Also habe ich es eingefroren und vergraben. Und dann kam der Hai.
- **Tadeo:** Der Hai! Hat er dein Schiff auch kaputt gemacht?
- **Käpt'n Paco:** Ja. Und ich habe mich so geschämt. Darum habe ich nie etwas gesagt.
- **Käpt'n Paco:** Nur den Schlüssel habe ich heimlich vor die Tür gelegt.
- **Käpt'n Paco:** Und die Flaschenpost war auch von mir.
- **Tadeo:** P wie Paco!
- **Tadeo:** Darum hast du immer Hm, hm gesagt!
- **Käpt'n Paco:** Ich war zu alt, um selbst zu gehen. Ich brauchte einen Helden.
- **Dorfältester:** Du hast uns Tadeo geschickt. Das hast du gut gemacht.
- **Dorfältester:** Und du hast die Wahrheit gesagt, Paco. Das war mutig.
- **Tadeo:** Das Gold ist für das Dorf!
- **Oger:** Und ich? Gibt es auch Kuchen?
- **Tadeo:** Und das hier war auch in der Truhe. Was ist das nur?
- **Dorfältester:** Zeig mal her... Das gibt es doch nicht! Ein Plan für eine Rakete!
- **Tadeo:** Eine Rakete? Was will man denn mit einer Rakete?
- **Dorfältester:** Eine alte Legende erzählt von einer Rakete. Und von einer Welt, weit, weit weg.
- **Tadeo:** Eine andere Welt? Wie kommt man dahin? Was gibt es dort?
- **Dorfältester:** Das, mein Junge, ist eine Geschichte für ein anderes Mal.
- **Chuleta:** Gack! Ein goldenes Ei!
- **Erzähler:** Der Vulkan schläft, alle Wesen sind lieb. Und Tadeo schaut hinauf zu den Sternen.

## What the new lines need in the code

Most of the work is in the data. These places do more than read a script:

| Where | What changes |
|---|---|
| `game/opening.ts` | Play `intro_sailing` over black and `intro_landing` before `climbOut()`. |
| `challenges/volcano/rescue.ts` | Play `volcano_paco_found` before the lift. The camera beats count lines (`line === 2`, `line === 3`), so they move to the stone line and Paco's answer. Paco starts walking off so that the narrator's last line fits the picture. |
| `game/lake.ts`, `game/Game.ts` | First-tablet talk, a talk after each lit tablet, `lake_still` before the rise and `lake_gone` after the fade. `Game.ts` is at its limit of about 550 lines, so this flow goes into `lake.ts`, and `readTablet` should get shorter, not longer. |
| `game/StoryWorld.ts` | `beforeQuest(6)`: `forest_hedge` before the opening, `forest_hedge_open` after it, both inside the check that the hedge is still up. |
| `challenges/cave/index.ts` | `cave_sword_before` and `cave_sword_after` replace the two `slice` calls. |
| `challenges/ogre/story.ts` | No flow change. `lines.slice(1)` now returns more lines. |
| `challenges/mountain/` | **The one visual addition.** Today the summit only shows open sea, so "Schau, die kleine Insel! Und da ist die Flosse..." matches nothing on screen. `decor.ts` already has the far volcano, washed towards the sky so that it sits in the haze; a small island with a fin circling it goes on the sea in the same way. The fin is made bigger than life, so that a child can pick it out at that distance. The final camera in `MountainChallenge.ts` holds them above the dialogue box for those lines, and the frame rate stays as it is. |
| `challenges/sea/SeaChallenge.ts` | `raiseBerries` is called on the "Hier, Hai!" line instead of on any Tadeo line. `shark_defeat` is said whole, and `sea_landed` replaces `slice(1)`. |
| `challenges/treasure/script.ts`, `reveals.ts` | The `lines(name, from, to)` ranges become the new keys. `treasure_crown` plays after `crownFlight`. |
| `challenges/finale/ending.ts` | `finale_stone` after the walk, `finale_calm` after `home.settle()`, and the Hüter fades after the longer thanks. |
| `challenges/festival/script.ts` | `festival_opening` in `welcome()`. The `beats` array has one entry per line and grows from 8 to 25: keep today's beats on the lines they belong to, and give the new ones a camera on whoever speaks. Line 2 (all still) is the wide shot with nobody moving, and the ogre's line needs the camera on the ogre. The plan comes out on "Und das hier war auch in der Truhe", the elder takes over on "Zeig mal her", and the rocket drawing on the plan is in the picture on his next line. On the last line Tadeo looks up at the stars, and that leads into `party()`. |
| `data/items.ts` | "Monster" becomes "Wesen" in the berries' description. |
| `data/dialogues.ts` | At 688 lines it is already over the 500-line guide and will roughly double. Move the scripts into one file per part of the story under `data/story/` and let `data/dialogues.ts` merge them, so that no import has to change. `scripts/voice/lines.mjs` reads every file under `src/`, and its speaker helpers like `tadeo("...")` work there too. |

## Voices

Every changed line is recorded with `npm run voices`, which costs ElevenLabs credits. The script has 301 lines, of which
about 230 are new or changed: about 12,000 characters and about 15 minutes of speech at the pace of today's recordings.
Run `npm run voices -- --dry-run` first and check that it lists only lines from this document and that no speaker is
missing. All speakers already have a voice. The generator deletes recordings that are no longer used, and the new files
and `manifest.json` get committed.

## Proof

- `npx tsc --noEmit -p .` is clean.
- A one-off check over all lines in `src/` that lists any changed line above 14 words. It must list nothing.
- `npm run voices -- --dry-run` reports nothing missing after recording, and a full playthrough logs no `[voice] no recording`.
- E2E: `title`, `island`, `volcano`, `cave`, `forest`, `ogre`, `village`, `mountain`, `sea`, `treasure`, `finale`,
  `voices` and `fps` all pass, with proof in `scripts/e2e/out/<name>/`. The checks that pin old lines need updating:
  - `island.mjs`: "Paco says Hm, hm." and "the legend is nine lines", the ghost's "11 lines, under the limit of 12", and
    the portrait check on "Danke, Junge! Ich bin Käpt'n Paco."
  - `volcano.mjs`: the expected conversation list, and it must also see `volcano_paco_found`.
  - `finale.mjs`: the screenshot moments, which go by parts of lines, still have to be found.
  - The other files only look for parts of lines that this script keeps. Run them and fix what fails.
- New checks in those files: mashing Space through each changed scene leaves the game correct, the first-tablet talk plays
  only once, `forest_hedge` is skipped when the hedge is already gone, and the berries come out on "Hier, Hai!".
- Screenshots of the moments where a line talks about the picture: the old stone, the hole, the small island and the fin
  from the summit, the camera on the ogre at the festival, and the wide shot on "Auf einmal ist es ganz still am Feuer."
- **Final check, by the owner:** Tadeo plays it, stays with the long scenes, and can retell the story.

## Where the work happens

- A push to `main` publishes to tadeo.fun, so this is built on a branch in its own worktree, and nothing reaches `main`
  until the owner says so. `.env` isn't in git and has to be copied to the worktree for `npm run voices`.
- The narration branch starts from `42aba37` on `magic-forest-arch`, one commit ahead of `main`, which holds the hedge work: the arch is the only way into
  the Zauberwald, the thorns block it, the quest starts at `[-12, 23.5]` on the lake side, and Chuleta has a line for
  anyone standing behind the hedge. `forest_hedge` is staged there. `Game.ts` is 548 lines at that commit.
- The main checkout still has uncommitted changes to `CHANGELOG.md`, `scripts/e2e/title.mjs` and `src/game/Game.ts`, for the
  title flight. They aren't part of this work and are left alone.
- `AGENTS.md` gets the before/when/after pattern and the language rules, so new scenes follow them. `CHANGELOG.md` gets an
  entry.

## Calls made in writing this (to check while reading)

- The owner read the landing, the volcano start, Paco and the elder. Everything else here is new to the owner.
- One small word change in those approved scenes: "Und da hinten raucht ein Berg", so that "riesig" isn't said in two
  lines close together.
- `volcano_paco_found`, so that the rescue has words before the lift. The name tag says Stimme until he says his name.
- The running clues about Paco: "Der Hai, soso", "Eine Flaschenpost, soso", "Hm, hm" about the key, "Woher weißt du das so
  genau?", and the payoff "Darum hast du immer Hm, hm gesagt!"
- The heart-shaped hole runs from Paco's scene through the elder's talk to `finale_stone`.
- The ogre says he will carry the boat, which sets up Paco's line at the dock.
- "Er hat mit der Flosse gewinkt", in the past, because the shark has already gone when Tadeo talks.
- At the festival Paco retells the burn, the ice and the shark in his own words, and adds his shame and the key. The elder
  adds that telling the truth was brave, which is the one lesson the game states out loud.
- "Monster" goes everywhere, not only in the two lines the owner named, so the rhyme now says "nimmt den Wesen den Zorn".
- The Hüter can't say where the chest is, because he watched the pirate sail off and no further. That is why the map matters.
- "Vielleicht weiß der Dorfälteste mehr" sets up Tadeo asking about the plan at the festival.
- The end card keeps its line "Und bald kommt die Rakete!"
- The ogre asks for cake at the festival, for a laugh in the middle of the serious part.
- The shark swims along on the way back in the narrator's line. The picture doesn't show it, since that part is over black.
- The shark scene at sea in quest 1 stays without words, as built.

## Left to the builder

Exact camera work on the new lines, the look and place of the small island and the fin, the split of `data/story/` files,
the names of new keys where they read better, and small wording fixes where a line doesn't fit the picture.
