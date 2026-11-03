# Sea Voyage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn quest 10's straight 45-second lane into a 2–3 minute steered voyage through six sections, with ridable swells that are part of the ocean, animals and drifting things, planks that run out, and checkpoint buoys.

**Architecture:** `SeaChallenge` keeps the scene, the story flow (`run`, `arrive`) and the camera; a new `Voyage` owns
sailing (helm, route, things, planks, checkpoints). Every obstacle or animal is a `SeaThing` module with one shared
`update/reset` interface returning `SeaEvent`s, so `Voyage` only routes events. Swells are added to the ocean's wave
sum on the GPU (`SEA_GLSL`) and in JS (`Swells.height`), so the boat rides what the player sees. The fade-line-restore
step lives in `challenges/shared/retry.ts` for later quests.

**Tech Stack:** Three.js, TypeScript, Vite, Playwright E2E (`scripts/e2e/`), ElevenLabs renders via `npm run voices` /
`npm run audio`.

**Spec:** `docs/superpowers/specs/2026-11-03-sea-voyage-design.md`

## Global Constraints

- Controls: arrows + Space only. Sailing: ← → turn the bow, ↑ faster, ↓ slower; Space unused while sailing.
- German text for a 7-year-old, max 14 words per line, "Wesen" never "Monster", nobody says what they can't know.
- Every new spoken line goes into `src/data/story/seaTreasure.ts` with `line(...)` (so `scripts/voice/lines.mjs`
  finds its speaker), then `npm run voices`; commit the MP3s from `public/voices/`.
- New sound effects: `SOUNDS` in `scripts/audio/generate.mjs` + `EFFECTS` in `src/audio/Audio.ts`, then `npm run audio`.
- Shader pitfalls: clamp `pow` bases; additive glow `fog: false`; never normalise a zero vector.
- Files ≤ ~500 lines.
- 4 planks; every 10 starfish mend one (max 4). Out of planks: fade, one Erzähler line, back at the last buoy with
  4 planks and the starfish count from that buoy.
- Checkpoints live only in the running challenge (a reload starts at the dock). No easing after repeated failures.
- Shark fight: letting the green window pass costs a plank; pressing too early costs nothing. Out of planks in the
  fight restarts only the fight (throws back to 0).
- `npx tsc --noEmit -p .` clean after every task. E2E: `npx vite --port 5199`, restart it after source edits.

## Review Focus

1. **Out of planks while a dialogue is open** (e.g. a barrel hit during the off-course remark): the retry must wait
   for the dialogue to close, not stack two dialogues. → Task 6 test "retry waits for an open dialogue".
2. **Two hits in the same frame on the last plank** (rock + jellyfish): exactly one retry, planks never below 0.
   → Task 3 test "double hit on the last plank retries once".
3. **Restart in the middle of a whirlpool spin or a swell jump**: the boat must come back level, not spinning or in
   the air. → Task 6 test "retry during a spin lands level".
4. **Holding ↓ forever**: the boat must never stop or sail backwards (minimum speed), or a child is stuck.
   → Task 2 test "holding ↓ keeps moving".
5. **Steering into the treasure island or an islet**: the boat must not sail through land; islets are blocked like
   rocks (a hit) and the current pushes back. → Task 2 test "an islet is not passable".

---

## File Structure

- `src/challenges/shared/retry.ts` — create: fade, Erzähler line on black, restore, fade back. Shared.
- `src/challenges/sea/route.ts` — create: data only. `ROUTE` waypoints, `SECTIONS` (buoy, contents), `COURSE_END`.
- `src/challenges/sea/helm.ts` — create: heading, speed, steering, channel current.
- `src/challenges/sea/things.ts` — create: `SeaThing`, `SeaEvent`, `BoatState` types.
- `src/challenges/sea/swells.ts` — create: swell state, JS height, uniforms, ride/hit judgement (a `SeaThing`).
- `src/challenges/sea/ocean.ts` — modify: `SEA_GLSL` adds swell term + foam; uniforms.
- `src/challenges/sea/course.ts` — modify: drop the wave meshes; rocks + arches + starfish from `route.ts`; reset.
- `src/challenges/sea/dolphins.ts`, `jellyfish.ts`, `whirlpool.ts`, `whale.ts`, `drift.ts` (barrels + bottle),
  `buoys.ts`, `fin.ts` — create: one `SeaThing` each.
- `src/challenges/sea/planks.ts` — create: plank count, mending, out-of-planks.
- `src/challenges/sea/voyage.ts` — create: wires helm, things, planks, checkpoints; owns sailing.
- `src/challenges/sea/SeaChallenge.ts` — modify: delegate `sail()` to `Voyage`; keep scene, `run`, `arrive`.
- `src/challenges/sea/sharkFight.ts` — modify: miss costs a plank; out of planks restarts the fight.
- `src/challenges/sea/boat.ts` — modify: `surface` sampler, `leap()`, `losePlank()`, `spin`.
- `src/challenges/sea/seaUI.ts` — modify: `setPlanks(n)` beside the voyage bar.
- `src/challenges/sea/scenery.ts` — modify: treasure island and islets moved to the longer course.
- `src/data/story/seaTreasure.ts` — modify: changed `sea_crossing` line, new keys (Task 7).
- `scripts/e2e/sea.mjs` — modify: steer to waypoints. `scripts/e2e/seaVoyage.mjs` — create: the new checks.
- `src/game/Game.ts` or wherever `?challenge` is read — modify: `&section=N` debug start (Task 2).
- `README.md` (debug params, E2E list), `AGENTS.md` (convention, E2E list), `src/challenges/types.ts` (header), `CHANGELOG.md`.

## Shared types (Task 1 produces; every later task consumes)

```ts
// src/challenges/sea/things.ts
export interface BoatState { x: number; z: number; heading: number; speed: number; airborne: boolean }
export type SeaEvent =
  | { kind: "hit"; at: THREE.Vector3; push: number; what: "rock" | "swell" | "jelly" | "barrel" | "islet" }
  | { kind: "boost"; seconds: number }
  | { kind: "jump"; height: number }
  | { kind: "spin"; center: THREE.Vector3 }
  | { kind: "lift" }
  | { kind: "find"; what: "bottle" }
  | { kind: "checkpoint"; index: number };
export interface SeaThing {
  readonly group: THREE.Object3D;
  /** `active` is false outside the sail phase: animate, but report nothing. */
  update(dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[];
  /** Put everything from section `index` on back to its start (a retry from that section's buoy). */
  reset(index: number): void;
}
```

`heading` is the yaw in radians, 0 = bow towards -z (the treasure island), positive = turned left (matches
`boat.root.rotation.y`).

---

### Task 1: Route data, things contract, steering helm

**Files:**
- Create: `src/challenges/sea/route.ts`, `src/challenges/sea/things.ts`, `src/challenges/sea/helm.ts`
- Modify: `src/challenges/sea/SeaChallenge.ts` (`sail()` uses `Helm`), `src/challenges/sea/course.ts` (reads `route.ts`;
  `COURSE`, `LANE`, `nextSafe` removed), `src/challenges/sea/scenery.ts` (`TREASURE.z` = `COURSE_END - 110`; islets
  spread along the longer course, never within `CHANNEL_HALF` of the route), `scripts/e2e/sea.mjs`
- Test: `scripts/e2e/sea.mjs`

**Interfaces:**
- Produces:
  - `route.ts`: `ROUTE: [number, number][]` (x, z waypoints from `[0, -12]` to `[0, COURSE_END]`),
    `COURSE_END ≈ -1250`, `CHANNEL_HALF = 30`,
    `SECTIONS: SectionSpec[]` with `SectionSpec = { name: string; startZ: number; rocks?: [x, z, r][]; arches?: [x, z, gap][]; swells?: SwellSpec[]; jellies?: [x, z][]; barrels?: [x, z, vx][]; dolphins?: [x, z][]; whirlpool?: [x, z, r]; whale?: [x, z]; bottle?: [x, z]; fin?: [x, z] }`,
    `SwellSpec = { zMeet: number; x0: number; x1: number; breakX?: [number, number] }`,
    `routeX(z: number): number` (centre of the channel at z, linear between waypoints),
    `nextWaypoint(z: number): [number, number]`.
  - Sections in this order (my call, from the spec): `start` (a few rocks, 2 gentle swells with no break, teaching),
    `dolphins` (dolphins + barrels), `arches` (rock gates ending in a narrow arch; the bottle off to one side),
    `jellies` (jellyfish field; fin sighting), `whirlpool` (whirlpool + whale), `bigSwells` (swells with breaking
    sections combined with rocks; fin sighting). Each roughly 190–210 m long.
  - `helm.ts`: `class Helm { heading: number; speed: number; constructor(); steer(dt: number, turn: -1|0|1, throttle: -1|0|1, boost: boolean): void; pull(dt: number, x: number, z: number): { offCourse: boolean } }`.
    Values: turn rate 1.3 rad/s, heading clamped to ±1.2 rad, cruise 9, ↑ 11.5, ↓ 6 (never below 6), boost 14.
    `pull` turns the heading towards `routeX(z)` when `|x - routeX(z)| > CHANNEL_HALF` and reports `offCourse`.
- `SeaChallenge.e2e` gains `heading`, `next: [x, z]` (from `nextWaypoint`), drops `safe`.

- [ ] **Step 1: Change `sea.mjs` to steer by heading.** The sail loop computes the bearing to `s.next` from `(s.x, s.z)`
  and holds ← or → until `|bearing - s.heading| < 0.08`. Add checks: `"the voyage takes 100–200 s"` (time from
  `phase === "sail"` to `"shark"`), `"the boat turns: heading changes sign at least twice"`.
- [ ] **Step 2: Run it, expect FAIL** (`node scripts/e2e/sea.mjs`: `s.next` undefined).
- [ ] **Step 3: Write `things.ts`, `route.ts`, `helm.ts`; `SeaChallenge.sail()` reads ← → ↑ ↓ into `Helm.steer`,
  moves the boat along `heading` (`x -= sin(heading)·speed·dt`, `z -= cos(heading)·speed·dt`), sets
  `boat.root.rotation.y = heading`. `Course` builds rocks and starfish from `SECTIONS` / `ROUTE`.**
- [ ] **Step 4: Run `npx tsc --noEmit -p .` (clean) and `node scripts/e2e/sea.mjs` (PASS, screenshots updated).**
- [ ] **Step 5: Commit** `feat(sea): steer the boat by its bow along a longer route`.

### Task 2: Channel current, islets, debug section start

**Files:**
- Modify: `src/challenges/sea/SeaChallenge.ts`, `src/challenges/sea/course.ts` (islets from `scenery.ts` collide as
  `what: "islet"`), the `?challenge` reader in `src/game/Game.ts:91` (pass `section` to the sea challenge through
  `ChallengeContext` as `startSection?: number`), `src/challenges/types.ts`, `README.md` debug table
- Create: `scripts/e2e/seaVoyage.mjs` (from `scripts/e2e/lib/harness.mjs`)

**Interfaces:**
- Produces: `ChallengeContext.startSection?: number`; `?challenge=sea&section=N` starts sailing at section N's buoy
  (skips the dock dialogue). `SeaChallenge.e2e` gains `offCourse: boolean`, `section: number`, `speed: number`.
- Off course: Chuleta (not a gull as the spec says: a gull would be a new speaker needing a face and a voice — my
  call) says `sea_offcourse` (Task 7 records it; until then the key exists with its text) at most once
  per 10 s.

- [ ] **Step 1: In `seaVoyage.mjs` write checks:** `"sailing far off course is turned back"` (start `section=1`, hold →
  for 8 s: `offCourse` became true, then within 6 s of releasing `|x - routeX| < CHANNEL_HALF`);
  `"holding ↓ keeps moving"` (hold ↓ 5 s: `speed >= 6` and `z` decreased);
  `"an islet is not passable"` (steer at the nearest islet: a hit happens and the boat is never inside its radius).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement the param, `Helm.pull`, islet collision, the remark.**
- [ ] **Step 4: tsc clean; `node scripts/e2e/seaVoyage.mjs` PASS.**
- [ ] **Step 5: Commit** `feat(sea): a current brings Tadeo back to the route`.

### Task 3: Planks and the shared retry

**Files:**
- Create: `src/challenges/sea/planks.ts`, `src/challenges/shared/retry.ts`, `src/challenges/sea/voyage.ts` (move
  `sail()`, `onHit()` and the starfish handling out of `SeaChallenge.ts` here)
- Modify: `src/challenges/sea/seaUI.ts` (`setPlanks(n: number)`: 4 plank icons beside the voyage bar, a lost one greyed),
  `src/challenges/sea/boat.ts` (`losePlank(): void` — a plank piece flies off with spin and splashes),
  `src/data/story/seaTreasure.ts` (`retry_sea_1..3`: three Erzähler lines, e.g.
  "Schade! Das Boot braucht eine kleine Pause. Versuch es gleich noch mal!"),
  `src/challenges/types.ts` header + `AGENTS.md` convention ("Never a game over" → "Mistakes cost something; too many
  fade back to the last checkpoint with a kind line (`challenges/shared/retry.ts`).")
- Test: `scripts/e2e/seaVoyage.mjs`

**Interfaces:**
- Produces:
  - `retry.ts`: `export async function retryFromCheckpoint(ctx: ChallengeContext, lines: DialogueScript[], restore: () => void): Promise<void>`
    — waits until `ctx.ui.dialogue.isOpen` is false, `engine.fade(1, 600)`, `restore()`, `ui.sayOverBlack(random of lines)`,
    `engine.fade(0, 600)`.
  - `planks.ts`: `class Planks { count: number; readonly max = 4; hit(): boolean /* true when this hit used the last one */; collect(starfish: number): boolean /* mended */; refill(): void }`.
  - `voyage.ts`: `class Voyage { constructor(deps: { ctx, boat, course, things: SeaThing[], ui: SeaUI, fx, cam, popups }); update(dt: number, t: number, active: boolean): void; readonly planks: Planks; checkpoint: { index: number; x: number; z: number; starfish: number }; retrying: boolean; starfish: number }`.
    While `retrying`, hits are ignored.
- `SeaChallenge.e2e` gains `planks`, `retries`, `checkpoint`.

- [ ] **Step 1: Checks in `seaVoyage.mjs`:** `"a rock hit costs one plank"`; `"10 starfish mend a plank"` (lose one,
  then follow the trail: `planks` back to 4); `"out of planks fades and restarts at the last buoy with 4 planks"`
  (`section=2`, ram rocks: `retries` 1, `z` within 15 m of the section's `startZ`, `planks` 4, starfish equals the count
  at the buoy, the screen was black in between, an Erzähler line was said);
  `"double hit on the last plank retries once"` (`retries` increases by exactly 1, `planks` never < 0).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement; checkpoint 0 is the start of the sailing phase (or `startSection`).**
- [ ] **Step 4: tsc clean; `seaVoyage.mjs` and `sea.mjs` PASS.**
- [ ] **Step 5: Commit** `feat(sea): planks, and a retry from the last checkpoint`.

### Task 4: Ridable swells in the ocean

**Files:**
- Create: `src/challenges/sea/swells.ts`
- Modify: `src/challenges/sea/ocean.ts` (`SEA_GLSL`: `uniform vec4 uSwells[MAX_SWELLS]` (x centre, half length, z, amp)
  and `uniform vec2 uSwellBreak[MAX_SWELLS]`; height and gradient add a crest across x with tapered ends; the ocean
  fragment puts foam on crests and a churning white band over the break range), `src/challenges/sea/wake.ts` (same
  uniforms), `src/challenges/sea/course.ts` (remove the wave mesh, shader and `addWave`),
  `src/challenges/sea/boat.ts` (`surface: (x: number, z: number, t: number) => number` used for its samples, defaults
  to `seaHeight`; `leap(height: number): void` — airborne arc, spray on landing)
- Test: `scripts/e2e/seaVoyage.mjs`

**Interfaces:**
- Produces: `MAX_SWELLS = 4` (only the nearest are fed); `class Swells implements SeaThing { height(x: number, z: number): number; uniforms: { uSwells, uSwellBreak } }`.
  A swell rolls towards +z with `z = zMeet - (bz - zMeet) · 0.6` (as today). As its crest passes the boat: bow within
  0.45 rad of straight into it and outside `breakX` → `{ kind: "jump", height: 1.6 }`; otherwise
  `{ kind: "hit", what: "swell" }`. Crest height 2.4, width along z ~6.
- Starfish over a crest's meeting point float 2 m up, reachable only in a jump (one per non-teaching swell).
- `SeaChallenge.e2e` gains `airborne`, `jumps`.

- [ ] **Step 1: Checks:** `"a swell taken bow-first is a jump, not a hit"` (`section=0`, drive straight: `jumps` ≥ 1,
  `planks` 4); `"a swell taken sideways costs a plank"` (turn to heading ±0.9 before the crest: `planks` 3);
  `"the boat rides the visible swell"` (sample the GPU height via `boat.root.position.y` vs `Swells.height` while the
  crest passes: differ < 0.3); screenshot `swell_ride.png` mid-jump and `swell_break.png` showing the foam band.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: tsc clean; `seaVoyage.mjs` PASS; look at the screenshots: the swell must read as the sea rising.
  `node scripts/e2e/fps.mjs` no worse than before.**
- [ ] **Step 5: Commit** `feat(sea): swells rise from the ocean and can be ridden`.

### Task 5: Sections' things (dolphins, arches, jellyfish, barrels, bottle, whirlpool, whale, fin, buoys)

**Files:**
- Create: `dolphins.ts`, `jellyfish.ts`, `drift.ts`, `whirlpool.ts`, `whale.ts`, `fin.ts`, `buoys.ts` in
  `src/challenges/sea/`; arches go into `course.ts` (two stacks + a lintel; the stacks collide as rocks)
- Modify: `voyage.ts` (route events: `boost` → `Helm.steer(…, boost)` for the seconds; `spin` → boat spins one full
  turn in 1.6 s and is thrown out towards the route, steering locked meanwhile; `lift` → boat rides up 1.5 m on the
  spout; `find` → Tadeo says `sea_bottle`; `checkpoint` → save), `course.ts` (feeds the nearest rocks/islets into the
  24 `uIsles` slots every 0.5 s; scenery's islets keep their fixed slots)
- Test: `scripts/e2e/seaVoyage.mjs`

**Interfaces:** each module exports one class implementing `SeaThing`, built from its `SECTIONS` fields.
Dolphins: following within 4 m behind one for 1 s → `boost` 3 s. Jellyfish: drift in slow circles, touch → `hit`.
Barrels: drift across with their `vx`, touch → `hit`. Whirlpool: within `r` → `spin` once (no hit). Whale: surfaces
when the boat is 40 m away; within 6 m → `lift`. Fin: a dorsal fin cuts across ahead of the boat once, ~25 m away,
no collision. Buoys: one per section start after `start`, a flag, a bell `sfx_buoy`; passing its z → `checkpoint`.

- [ ] **Step 1: Checks (one per thing, each from its `section=N`):** `"a dolphin gives a boost"` (speed > 12);
  `"a jellyfish costs a plank"`; `"a barrel costs a plank"`; `"the whirlpool spins without a plank lost"` (heading
  turns ≥ 2π, planks unchanged); `"the whale lifts the boat"` (`boat y` > 1); `"the bottle is found"` (line said);
  `"passing a buoy saves the checkpoint"`; `"the fin shows in jellies and bigSwells"` (visible at least once each);
  `"retry during a spin lands level"` (out of planks mid-spin: after restore heading ≈ 0, `airborne` false).
  One screenshot per thing.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement each module in the style of the existing sea scenery (toon materials via `modelMaterials`,
  `Fx` splashes).**
- [ ] **Step 4: tsc clean; `seaVoyage.mjs`, `sea.mjs` PASS; `fps.mjs` no worse.**
- [ ] **Step 5: Commit** `feat(sea): dolphins, arches, jellyfish, whirlpool, whale and buoys along the route`.

### Task 6: Shark fight costs planks

**Files:**
- Modify: `src/challenges/sea/sharkFight.ts` (`FightStage` gains `onMiss(): Promise<boolean>` — true when the planks ran
  out; `splashBoat` becomes a bump costing a plank; out of planks → `retryFromCheckpoint` restores shark to angry,
  `throws = 0`, boat planks 4, and `run()` continues its loop), `src/challenges/sea/SeaChallenge.ts`
- Test: `scripts/e2e/sea.mjs` (existing "a miss is no game over" check changes to "a miss costs one plank"),
  `scripts/e2e/seaVoyage.mjs`

- [ ] **Step 1: Checks:** `"a miss costs a plank"`; `"a too-early press costs nothing"`; `"out of planks in the fight
  restarts only the fight"` (miss 4 times: `retries` +1, `phase` still `"shark"`, `throws` 0, `z` unchanged);
  `"retry waits for an open dialogue"` (out of planks while a line is open: only one dialogue open at a time).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: tsc clean; both tests PASS.**
- [ ] **Step 5: Commit** `feat(sea): the shark bumps the boat when a berry misses`.

### Task 7: Lines, voices, sounds, docs

**Files:**
- Modify: `src/data/story/seaTreasure.ts` — `sea_crossing`'s last line becomes e.g. "Vorsicht, hohe Wellen! Fahr gerade
  drauf zu, dann hüpft das Boot!"; `sea_dock` gets a Paco line about the buoys ("Bei jeder Boje bist du sicher.")
  ; final wording of `sea_offcourse` (Chuleta), `sea_bottle` (Tadeo reads; the note must not reveal what Tadeo can't
  know), `sea_whirlpool` (Tadeo, said after the spin), `retry_sea_1..3`
- Modify: `scripts/audio/generate.mjs` `SOUNDS` + `src/audio/Audio.ts` `EFFECTS`: `sfx_plank_crack`, `sfx_whirlpool`,
  `sfx_whale_spout`, `sfx_dolphin`, `sfx_buoy`
- Modify: `README.md` (`&section=N`, `seaVoyage` in the E2E list), `AGENTS.md` (E2E list), `CHANGELOG.md`
- Test: `node scripts/e2e/voices.mjs`, `node scripts/e2e/storyLines.mjs`, `node scripts/e2e/sea.mjs`

- [ ] **Step 1: `npm run voices -- --dry-run` and `npm run audio -- --dry-run`: the new lines and sounds are listed.**
- [ ] **Step 2: `npm run voices` and `npm run audio` (spend credits); no `[voice] no recording` in a `sea.mjs` run's log.**
- [ ] **Step 3: `voices.mjs`, `storyLines.mjs`, `sea.mjs`, `seaVoyage.mjs` PASS; tsc clean.**
- [ ] **Step 4: Commit** `feat(sea): voices and sounds for the voyage` (stage files by name; other sessions share the
  checkout).
