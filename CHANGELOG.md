# Changelog

## Unreleased

### Sea voyage

- The trip to the treasure island is a real voyage now: the boat steers with a heading, and a current pulls it back
  into the channel when it strays, with a "Gack!" from Chuleta
- Six stretches along the way: a dolphin to ride behind for a boost, rock arches to sail through, a field of glowing
  jellyfish, a whirlpool that spins the boat round, a whale whose spout lifts it, and big rolling swells to jump
- Swells taken bow-first make the boat hop; taken sideways, or where they break white, they cost a plank
- The boat has four planks: every bump costs one, ten starfish mend one. With the last one the screen fades, the
  Erzähler says a kind line and the boat sails on from the last buoy it passed
- A message in a bottle, drifting barrels and the shark's fin cutting the water ahead
- In the shark fight a miss lets the shark bump the boat and costs a plank; without planks only the fight starts over
- New sounds for planks, the whirlpool, the whale, the dolphin and the buoys
- `?challenge=sea&section=N` sails straight off from a section's buoy

### Fifty coins

- 50 gold coins instead of 30: twenty more lie in secret corners, so every outer region holds about eight
- The outfits take more coins: the straw hat 15, the pirate hat 25, a new feather hat 35 and the sunglasses all 50
- The coin bar shows the next outfit, with its picture and the coin count that unlocks it
- Outfits once earned stay: a save from the days of 30 coins keeps what it had

### Boat and docks

- The boat no longer looks as if it has a hole: the sea stays out of the hull, at the dock and at sea alike, and the gap
  inside the rail is closed
- In the opening Tadeo sits beside the sail instead of in it, so it no longer covers his face
- Tadeo can no longer step off a dock into deep water

### Ponds and puddles

- Water follows one rule everywhere: shallow water can be waded, deep water is the edge. Steep banks of puddles,
  ponds, the lake and the lagoon no longer block the way, so Tadeo gets in and out from every side, walking or jumping
- The sea cliffs and the river still keep him from going round the ogre's bridge or the boulder

### Under the hood

- One table holds every quest, and one place decides how a quest is reached, played and completed, whether the game
  started from the title, a save or a jump. The player sees no difference
- Island scenes share one director for talks, remarks and the camera, instead of a list of helpers each
- E2E tests go through a small typed probe and a shared harness, and a new test checks the quest table against the
  challenges and the menu
- `?challenge=festival` plays the festival and the end card instead of crashing
- The island builds about a quarter faster at startup, with exactly the same terrain
- Less waste every frame: key presses, sparks, coin sparkles, collision lookups, the boat's wake and the status bar
- Removed code nothing used, and replaced local copies of small helpers with one shared version

### Answer stones

- The numbers on the elder's answer stones are sharp and easy to read instead of melting into their glow, and the chosen
  one now really shines gold

### Menu

- A faint ship's wheel in the corner opens a small menu, with a click or Esc. The world stands still while it is open
- Sound, music and voice each have a switch. Music can now go quiet on its own, while effects and island sounds play on
- While Tadeo walks freely, the menu shows a map of the island painted from the real terrain, with Tadeo on it and 12
  places to travel to
- The list "Spielen ab" in the menu starts the story at any of 11 points, from the title, a talk or a challenge too,
  and the story plays on from there to the end

### Music and island sounds

- New recorded soundtrack in place of the old chiptunes: warm orchestral folk with fiddle, French horns, harp and soft
  strings, and something darker for the cave. It still changes with the place and the quest, the mountain climb now has
  its own track, and each track lasts up to two minutes instead of a few seconds
- The island sounds real: waves grow louder near the shore, and the jungle, swamp and flower hills each have their own
  background. Gulls, songbirds, parrots, frogs, skylarks and sheep call from where they live
- Every sound effect is now recorded instead of synthesised. The volcano has a real rumble, splashes sound like water,
  Flocke yips when she hops, the village drums are real drums and the hens really cluck
- Music and island sounds step back while someone talks, so every word stays easy to follow

### Turtle family

- New side quest at the lagoon, for any time in the game: the rumbling volcano scared Frau Moos' five babies off along
  the beach. A baby runs after Tadeo once he comes close, in a line that follows his way and copies his jumps. Beside
  their mother they scuttle into the water
- All five home earns the Schildkrötenhut, a little turtle that sits on Tadeo's head. Afterwards the babies swim behind
  her for good
- Frau Moos has a voice of her own

### Coins

- The ten quiet coins now lie in secret corners of the outer regions: behind the windmill and the stone head, past the
  jungle pool, on the far banks of the swamp pond, behind the beach huts. Before, none could reach those places. There
  are still 30 coins

### Title screen

- The game is now called "Die Abenteuer von Tadeo", with the subtitle "Die Schatzinsel", on the title screen and in
  the browser tab
- The music starts as the page loads instead of waiting for a press. A browser that holds sound back until the first
  key or click starts it on that press
- The flight behind the logo starts in clear air instead of inside a cloud

### Talking and riddles

- The camera in a talk looks for a spot with a free view, so a lantern post, a roof or Tadeo's boat no longer fills the
  picture
- "Hier komme ich später wieder hin" comes once per place during a quest instead of every 12 seconds
- The riddles at the lake end with "Was bin ich?"
- The word on screen and in what Chuleta and the Hüter say is now "Zauber-Eis"

### Thorn hedge

- The forest arch is a magic door: the Zauberwald can only be entered through it. The hedge is about half as long and
  plugs the arch, so it no longer looks like a wall you can simply walk round
- "Los geht's!" only appears on the lake side, so the sword scene can no longer start behind the thorns with the camera
  inside the arch
- Walking behind the hedge makes Chuleta say there is only meadow there and the way in is through the arch

### Longer narration

- Every one of the twelve quests now tells a small story: a talk before it, a moment when something happens, and a
  talk after. Lines stay short (at most 14 words), a moment runs 3 to 8 lines and a big scene 10 to 30. The story text
  lives in `src/data/story/`, merged by `data/dialogues.ts`
- The elder and the Hüter tell the legend and the rhyme in pieces, and a reload in a long talk plays it again from
  its start
- At the summit the camera shows the whole island and, far out in the sea, the small island and the shark's fin
- "Wesen" instead of "Monster" everywhere
- Flocke has a new voice because the old one was withdrawn from the library
- That first replacement didn't fit, so Flocke now speaks with Skyloe, a high and funny falsetto
- Tadeo is on holiday at the sea instead of living there
- On the landing beach the narrator says that a shark attacked the boat and the waves carried Tadeo ashore
- Chuleta's name is recorded the Spanish way, stressed on its second syllable
- `scripts/e2e/storyLines.mjs` checks that every line of the design is in the game

### Story rethink

The adventure is one story now: the volcano's heart, the Feuerherz, was stolen, and every place and object on the
island has a reason. A 7-year-old can retell it: "Der Vulkan hat ein Herz. Ein Pirat hat es gestohlen. Ich habe vier
Sachen gefunden und das Herz zurückgebracht. Und der Pirat war Paco!"

- Twelve quests instead of ten. The first is a cutscene; the village is visited twice (the elder's legend, then the
  key); the lake, the shark and the finale are new or rebuilt. The HUD counts "von 12"
- The opening: Tadeo finds a bottle with a treasure map (the map card), a shark smashes his boat, and a voice calls
  from the volcano. The map card comes back in quests 3 and 11
- The volcano shows what the eruptions did: about half as many rocks, two of the three bridges are broken and
  crossed by jumping from rock to rock, and Paco lies trapped beside the old stone with the empty heart-shaped
  hollow. Käpt'n Paco replaces Opa Kalle, with his own look and voice
- The lake: three tablets ask riddles, and the Hüter (replaces the Geist, with a real portrait) rises and tells the
  rhyme of the four things
- The cave is a natural cave with a hungry mole (Maulwurf) and painted clues for the crystals, instead of the mine
  with levers and gates
- The island follows the story (`game/StoryWorld.ts`): the thorn hedge stands until the sword opens it, the boulder
  stays on the mountain trail until the ogre lifts it, Tadeo's wreck becomes his mended boat at the north dock, Paco
  is away until the village quest and waits at the dock for the crossing, and the volcano rumbles harder after every
  finished quest
- The ogre fights because the heart is gone, and becomes a friend after he eats a berry
- The shark is calmed by three berries thrown into its open mouth, not by the hammer. The hammer is only for the
  chest's Zauber-Eis. The sea trail is glowing starfish
- The chest also holds the Feuerherz, a plan and Paco's note signed "P."
- The last quest brings the heart home through the volcano at full rock rate, then the whole island celebrates a
  night festival where Paco owns up, before the end card
- Chuleta's hints and cheers, the quest names and the save format (version 4, so old saves start over) follow the new
  order. "Schatzinsel" now means only the small island
- Every new or changed line has at most 14 words, and a conversation at most 5 lines (the legend, the lake rhyme and
  the festival are longer). 159 new recordings, including the new speakers Paco, Stimme, Maulwurf and Hüter
- `scripts/e2e/finale.mjs` plays the last quest through the festival; `voices.mjs` also checks that every line in the
  source has a recording
- Lettered signs are gone outside the village (signposts, "ZIEL", the ogre's toll board, "Höhle", "Zauberwald"):
  the golden star, the compass and Chuleta's hints do the guiding

### Changed

- Tadeo's hen is called Chuleta now (she was Henni)
- Tadeo's fringe sits higher, in a soft open arch, so it no longer covers his brows or makes him look angry
- New voices: every line is now recorded once with ElevenLabs and shipped as an MP3 in `public/voices/`, so the
  game speaks the same on any static host. `npm run voices` renders new or changed lines. This replaces the local
  Piper voice server, and the game no longer needs `uv`
- The game draws at most 60 frames a second, so 120 Hz screens no longer keep the graphics chip flat out
- Rendering uses at most 1.25× pixel density and 2× multisample anti-aliasing to reduce GPU load
- The voice now says a fixed sentence for the three lines with a changing value (fishing length, hen times); the
  exact number still appears on screen

### Added

- The game is published to GitHub Pages at <https://tadeo.fun> on every push to `main`
- A bigger island: four new regions grow out of the old coast, each with its own ground, plants and paths
  - Lagune: a sandy bay with a jetty, beach huts, sea turtles that pull in their heads, and a pod of
    dolphins leaping offshore
  - Dschungel: bamboo, giant leaves and mist around an old stone ruin with a pool; parrots loop over the
    tree tops
  - Sumpf: mangroves, puddles and a pond with a frog islet, a plank boardwalk to the old beach, croaking
    frogs and a cloud of fireflies
  - Blumenhügel: rolling flower meadows with a windmill, beehives and grazing sheep (one is black)
- Stepping stones across the river west of the village, new paths to every region
- Fish and dragonflies at the lagoon and the swamp pond
- `scripts/e2e/world.mjs`: walks every region path and checks landmarks, animals and fps

### Changed

- The title flyover circles wider to show the whole island
- Tadeo wears his hair with a soft fringe instead of spikes
- His companion is now Chuleta, a brown speckled hen with a red neckerchief (replaces Pico the parrot):
  she runs after Tadeo, pecks about, flutters onto his head when he rests or wades, and helps in the
  side games
- Ogre fight: the "Verteidigen" card is gone; each swing of the ogre is blocked by pressing Space when
  the shield ring turns green (too early shows "Zu früh!"), and blocks charge the special
- Mia's speckled hen is called Hilde now (Chuleta is Tadeo's hen)

### Fixed

- Classic 2D game keeps its own save, mute and narrator settings, so a 3D save on the same localhost
  port no longer drops Tadeo into the sea at the start
- A tree no longer hides the Hüter when he rises: the grove south of the first tablet, where the camera stood in the
  leaves, is now a clearing
- After a debug start with `?challenge=<name>`, Tadeo can walk again once the challenge is won, so the story goes on

## 2.0.0

The game is rebuilt in 3D with Three.js (the Phaser 2D version is kept in `classic-2d/`).

### Added

- 3D island overworld with shader water, grass, vegetation, landmarks, ambient life and post-processing
- Toon characters (Tadeo, villagers, elder, wise ones) and Pico the parrot as a flying sidekick with hints
- Ten 3D challenge scenes: volcano, cave, forest, ogre battle, village festival, mountain climb,
  sea crossing with the shark, treasure island finale
- Side games in the village: fishing with Fischer Jonas, catching Kleine Mia's hens (prize hats)
- 30 gold coins with outfit unlocks (straw hat, pirate hat, sunglasses)
- Island cameos: the ogre guards the bridge (and later waves as a friend), a shark fin circles the north pier
- Title screen with island flyover, intro flight, quest beacon, compass arrow and world prompts
- Local neural German voices (Piper TTS via `uv`) with per-character voices; browser speech fallback
- End-to-end tests for the island and every challenge (`scripts/e2e/`)

### Removed

- Phaser and the 2D scenes, sprites and turn-based combat system

## 1.0.0

- Original 2D pixel-art version (Phaser 3)
