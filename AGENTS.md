# AGENTS.md

Project guidance for coding agents. See README.md for setup, controls and debug URL parameters.

## What this is

A 3D island adventure (Three.js + TypeScript + Vite) for a 7-year-old German-speaking player.
Graphics quality ("wow") and joy matter more than anything else. It is live at https://tadeo.fun: every push to
`main` publishes it to GitHub Pages (`.github/workflows/deploy.yml`).

## Run

- `npm run dev` — dev server on :3000
- `npm run voices` — render new or changed spoken lines with ElevenLabs (needs `ELEVENLABS_API_KEY` in `.env`);
  `npm run voices -- --dry-run` shows what would be rendered without spending credits
- `npm run audio` — render new or changed music and sounds with ElevenLabs (same key, same `--dry-run`); the
  prompts are `SOUNDS` in `scripts/audio/generate.mjs`, and deleting an MP3 renders a new take of it
- `npx tsc --noEmit -p .` — type-check (must be clean)
- E2E: start `npx vite --port 5199`, then `node scripts/e2e/<name>.mjs` (questTable, title, world, island, volcano, cave, forest,
  ogre, village, talk, mountain, sea, treasure, finale, fishing, hens, coins, turtles, boat, menu, menuJump, jumpIn, voices,
  storyLines, music, fps). Proof goes to `scripts/e2e/out/<name>/`. Restart the server after editing source: once a
  module changed, Vite serves it with a `?t=` stamp, so a test's `import("/src/...")` gets a second copy of it and
  fails falsely.

## Architecture

- `core/Engine.ts` runs one `GameScene` at a time (scene, camera, optional `post` settings) with
  fades between them. `Engine.onFrame` runs before the scene update; `Game` uses it for the UI and flow.
- The island is the old ellipse plus four region lobes (lagoon, jungle, swamp, hills); `world/regions.ts`
  owns the lobes and their terrain, and `hf.regionAt(x, z, REGION_INDEX.<name>)` says where a region is.
  Landmarks sit at their `SPOTS` entry in `world/layout.ts`, which also feeds the vegetation keep-outs.
- `game/Game.ts` is the frame loop on the island: controls, prompts, NPC chats, the title screen and side games. Keep
  it under ~550 lines: put new features in their own module in `game/` (see `Sightings.ts`, `sideGames.ts`,
  `Wardrobe.ts`, `lake.ts`, `hedgeOpening.ts`, `boulderLift.ts`, `TurtleFamily.ts`).
- `data/quests.ts` is the quest table, data only: name, hint, reward, kind of goal and gate. A quest's number is its
  place in the list, which saves keep and `?quest=N` asks for; code names quests through `QUEST.forest`, never a number.
- `game/QuestFlow.ts` is how a quest is reached, played and completed: the three starts (`beginAdventure`, `resume`,
  `jumpTo`) share one arrival step, and it knows what each kind of goal asks for. Adding a quest: a row in the table, its
  challenge folder, a story point in `data/jumps.ts`, and `scripts/e2e/questTable.mjs` says what is missing.
- `game/IslandDirector.ts` is what island scenes share: `talk(script, framing)`, remarks, placing Tadeo, cinematics,
  shots and screen positions. Scenes take the director, not the camera rig or callbacks from `Game`.
- `game/StoryWorld.ts` makes the island follow the story. `apply(milestone)` sets what stands where (the thorn hedge,
  the mountain boulder, Tadeo's wreck or his mended boat, Paco's and the ogre's places), `rumble(finished)` shakes the
  volcano a bit harder after every quest, and `beforeQuest` / `afterQuest` hold the island scenes around a challenge.
- Story text lives in `src/data/story/`, one file per stretch of the story; `data/dialogues.ts` merges them.
- Challenges live in `src/challenges/<name>/index.ts` and default-export a `ChallengeFactory`
  (`challenges/types.ts`). They are found by `challenges/registry.ts` (`import.meta.glob`) and loaded
  on demand. A challenge resolves `finished` when won; the flow hands out the reward.
- Helpers used by several challenges go to `src/challenges/shared/`, not into another challenge's folder.
  Sibling challenges built as a pair reuse each other's files (sea → ogre kit, forest → cave materials,
  mountain → `volcano/kit`); a third user of such a file is the moment to move it to `shared/`, or to
  `src/characters/` when it is a character model.
- `audio/Audio.ts` plays music with `audio.playMusic(key)` from any scene, cross-fading once the file has loaded.
  `audio/samples.ts` matches each recording's loudness and blends its loop; `audio/Ambience.ts` holds the island's
  backgrounds and animal calls, and `game/IslandSounds.ts` mixes them by where Tadeo stands. A new sound effect goes
  into `SOUNDS` in `scripts/audio/generate.mjs` and into `EFFECTS` in `audio/Audio.ts`, then `npm run audio`.
- `ui/Menu.ts` is the menu behind the faint ship's wheel: sound switches and a list of story points everywhere, and
  a map to travel by (`ui/IslandMap.ts`) while Tadeo walks the island freely. While it is open `Engine.paused` stops
  the world and `Input.setBlocked` hides every key from the game. A new place goes into `data/places.ts`;
  `scripts/e2e/menu.mjs` checks it is good ground, connected on foot to the beach. A story point in `data/jumps.ts`
  reloads the page with its `?challenge` or `?quest` start plus `&jump`, which the menu then clears from the address.
- `classic-2d/` is the original Phaser 2D game, kept as a frozen snapshot for nostalgia. It has its own
  `package.json` and is not part of the type-check, build or E2E runs. Don't change it.

## Conventions

- **Every quest tells before, when something happens, and after.** At most 14 words per line; a moment runs 3 to 8
  lines and a big scene 10 to 30. Say "Wesen", never "Monster". Nobody says what they can't know.
- **Never a game over.** Mistakes restart the current attempt with a kind line.
- **Text is German, for a 7-year-old:** short sentences, simple words, warm and funny.
- **Every speaker needs a face and a voice:** add new speakers to `SPEAKERS` in `ui/Dialogue.ts`
  (portrait or emoji, colour) and to `CAST` in `scripts/voice/generate.mjs`.
- **Every spoken line is a recording in `public/voices/`:** after adding or changing a line, run `npm run voices`
  and commit the files. `scripts/voice/lines.mjs` finds lines next to their speaker; a line in a plain constant
  needs an `OWNERS` entry there. The game logs `[voice] no recording` and uses browser speech for a line it misses.
- **Lines with a changing value** (a time, a length) cannot be recorded: give them a fixed `spoken` version.
- **Controls are arrows + Space only** (M = mute, V = voice toggle and Esc = menu are global).
- **Sound before the first press:** a browser may hold audio back until a key or click. The audio clock stands still
  meanwhile, so sounds scheduled on it all play at once on that press. E2E checks of this must read the page without
  a gesture, because Playwright's `evaluate` and wait helpers count as one: see `inPage` in `scripts/e2e/title.mjs`.
- **Input:** read presses with `input.consume(code)`. Presses stay readable from the start of a frame
  until the next frame begins, so code resuming after an `await` still sees them.
- Instanced meshes spread over the whole island need `frustumCulled = false`.
- In the browser console use `window.game` only after `main.ts` ran (`<div id="game">` shadows it before).
- **E2E tests use `window.probe`** (`game/GameProbe.ts`), not private members of `Game`, for what the probe covers. Add
  to the probe when a test needs more. New tests start from `scripts/e2e/lib/harness.mjs`; move a helper there once
  two converted tests need the same version of it.
- The domain's words are in `GLOSSARY.md`.

## Shader pitfalls

- Clamp `pow()` bases (`pow(max(x, 0.0), k)`): a slightly negative base is NaN on Metal, and bloom
  smears a single NaN pixel into a black screen.
- Additive glow materials need `fog: false`, otherwise fog turns them into pale slabs.
- The sea is one transparent plane that writes no depth, so it runs through anything hollow standing in it. An open hull
  keeps it out with a lid in `Model.waterStop`: depth only, drawn after the opaque parts and before the water.
