# Sea voyage: a real sail with swells, animals and checkpoints

Quest 10 ("Der Hai", `src/challenges/sea/`). Status: design, awaiting the owner's approval.

## Why

The crossing is the weakest stretch of an otherwise rich game. Today it is a straight 18 m lane: the boat sails
forward by itself, ← → only slide it sideways, and 13 rows of rocks and waves pass in about 45 seconds. The waves are
separate curled meshes that slide over half the lane and can only be dodged, so they look pasted onto the sea (a
leftover of the 2D original). Nothing can go wrong, so nothing is at stake.

The owner wants the crossing **more challenging and more interesting**: a parcours with more things in it (animals,
items), more open, and with real consequences when Tadeo keeps hitting things.

## Goals

1. **Waves are part of the sea and can be ridden.** A big swell lifts the ocean surface itself (same water, same
   shader), rolling towards the boat. Meeting it bow-first carries the boat up and over with a little jump and spray;
   starfish can hang above the crest to be caught in the air. Meeting it sideways, or where it breaks (a foaming
   section), is a hit.
2. **The boat steers like a boat.** ← → turn the bow; the boat sails where it points. The sea is a wide, guided
   channel among islets, not a lane. The starfish trail and the treasure island on the horizon always show the way;
   sailing too far out, a gentle current and a gull's remark turn Tadeo back. Never an invisible wall with no reason.
3. **The route is a string of short sections, each with one idea**, separated by checkpoint buoys:
   - **Dolphins** leap alongside; sailing in their wake gives a speed boost.
   - **Rock arches**: gates of tall sea stacks, ending with a narrow arch to thread.
   - **Jellyfish field**: drifting jellyfish; touching one wobbles the boat and is a hit.
   - **Whirlpool**: it catches the boat, spins it once around and throws it out (funny; costs nothing, but it loses
     time and puts Tadeo off the trail).
   - **Whale**: it surfaces near the route; its spout lifts the boat (a moment, not an obstacle).
   - **Drifting things**: barrels and crates drifting across the route (hits); one message in a bottle as a small
     side find with a line of dialogue.
   - **The shark's fin** shows once or twice on the way, so the fight is foreshadowed.
   - **Big swells** (goal 1) appear in at least two sections, the last ones combined with rocks.
4. **Hits count, and too many end the attempt** (see "Failing" below). Gaps get tighter and obstacles move as the
   voyage goes on.
5. Graphics quality stays at the level of the rest of the game: the swells must look like the ocean rising, not like a
   mesh on top of it.

## Non-goals

- No change to the shark fight's core (timing ring, three berries), the arrival on the treasure island, or the dock
  scene, except where "Failing" says so.
- No failure mechanic for other quests yet. It is built so they can use it later, but only the sea uses it now.
- No elaborate game-over scene.

## Anti-goals (failure even if it works)

- A 7-year-old gets lost or stuck going in circles.
- Waves that still read as a separate object sliding over the water.
- A failed attempt that throws away more than one section of progress (a page reload may; see "Failing").
- Losing feeling like punishment: no scary sound, no "Game Over" text.

## Failing (new, shared)

This replaces the convention "Never a game over" for the sea now and for other quests later.

- **Planks**: the boat has 4 planks, shown next to the voyage bar (my call on the number and on planks as the
  picture; the builder may tune the number after playing). Every hit (rock, breaking swell, swell taken sideways,
  jellyfish, barrel) costs one; a plank visibly flies off the boat.
- **Starfish mend**: every 10 starfish collected give a plank back, up to 4. This makes following the trail pay.
- **Out of planks**: a fade to black, the Erzähler says one short, friendly, encouraging line (a few variants, e.g.
  "Schade! Das Boot braucht eine Pause. Versuch es gleich noch mal!"), and it fades back in at the last checkpoint,
  boat mended, sailing on. No more than that.
- **Checkpoints**: a buoy (with a little flag) between sections; passing it saves the place. A restart puts the boat
  back at the last buoy with full planks and the starfish count it had when it passed that buoy. Obstacles in that
  section reset. Checkpoints live only inside the running challenge: leaving or reloading the page starts the crossing
  at the dock again, as today (owner's decision: keep it simple).
- **No easing**: failing the same section again and again does not make it easier; every restart is the same section
  with 4 planks (owner's decision).
- **Shark fight**: a missed throw (letting the green window pass) now ends with the shark bumping the boat, costing a
  plank. Pressing too early still throws nothing and costs nothing, so mashing Space is not punished (my call). Out of planks during the
  fight: the same fade and line, and the fight starts over (the berries it already ate are lost); the voyage is not
  repeated. The fight start counts as a checkpoint.
- **Shared code**: the fade-plus-line-plus-restore step goes into `src/challenges/shared/` so later quests can call it
  with their own restore callback. The planks counter is the sea's own (other quests will show their lives their own
  way).
- **Docs**: the "Never a game over" convention in `AGENTS.md` and the header comment in `challenges/types.ts` change to
  describe the new rule: mistakes cost something; too many fade back to the last checkpoint with a kind line.

## Constraints

- Controls stay arrows + Space. While sailing: ← → turn, ↑ a little faster, ↓ slower (my call); Space is unused while
  sailing and stays the throw in the shark fight.
- German text for a 7-year-old, at most 14 words per line, "Wesen" never "Monster". Every new spoken line goes into the
  story data, gets recorded with `npm run voices`, and lines in plain constants need an `OWNERS` entry in
  `scripts/voice/lines.mjs`. New speakers (if any) need a face and a voice. `sea_crossing`'s last line ("Weiche ihnen
  mit den Pfeiltasten aus!") must change to match riding the swells.
- New sound effects (plank cracking, whirlpool, whale spout, dolphin, buoy passed) go into `SOUNDS` in
  `scripts/audio/generate.mjs` and `EFFECTS` in `audio/Audio.ts`, then `npm run audio`.
- Shader pitfalls in `AGENTS.md` apply (clamped `pow`, `fog: false` on additive glow). The ocean is one transparent
  plane that writes no depth.
- `ocean.ts` keeps a JS twin of the wave height (`seaHeight`); the swells must be added to both, so the boat, starfish
  and jump follow the surface the player sees.
- The ocean's shallows support at most `MAX_ISLES = 24` islands/rocks; a wider course with more rocks needs that raised
  or only the nearest ones fed to the shader.
- Files stay under ~500 lines: `SeaChallenge.ts` (407) and `course.ts` (324) will need splitting by section or
  feature (e.g. one module per creature/obstacle kind).
- Duration: the whole crossing about 2–3 minutes for a careful first try (my call; today about 45 seconds).

## Tests

- `scripts/e2e/sea.mjs` keeps driving the whole quest end to end. Its `scene.e2e` state grows what the bot needs to
  steer (the next waypoint) and what the new checks read: planks, last checkpoint, section.
- New checks, with screenshots in `scripts/e2e/out/sea/`: a swell ridden bow-first gives a jump and no hit; one taken
  sideways costs a plank; 10 starfish mend a plank; running out of planks fades and restarts at the last buoy with full
  planks; running out during the shark fight restarts only the fight; sailing far off course is turned back.
- `fps.mjs` must not get worse on the sea.

## Left to the builder

- The order of the sections, their exact layout and how many swells each has.
- How the swell is shaped in the shader (e.g. a travelling crest added to the existing wave sum) and how "breaking"
  shows, as long as the breaking part is clearly readable as white foam before the boat meets it.
- Turning rate, speeds, the boost's strength, the jump's height, and how the "too far out" current works.
- Models and animation for dolphins, whale, jellyfish, whirlpool, buoys, barrels and the bottle, in the style of the
  existing sea scenery.
- The wording of new lines, within the conventions above.
